# backend/app/api/routers/training.py
"""
API router for model training, MLflow, and model registry endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from collections import deque
import uuid
import time
from app.jobs.tasks import train_job, update_job_status
from app.core.celery_config import celery_app
from celery.result import AsyncResult
import json
from pathlib import Path
from app.core.mlflow_utils import promote_model as promote_model_util
from app.services.llm_service import reload_model
from mlflow.tracking import MlflowClient

# --- Pydantic Models ---

class Hyperparams(BaseModel):
    epochs: int = 3
    batch_size: int = 8
    learning_rate: float = 5e-5
    seed: int = 42

class StartTrainingPayload(BaseModel):
    job_name: str
    base_model: str
    train_file: str
    val_file: str
    use_lora: bool = True
    hyperparams: Hyperparams
    mlflow_experiment: str
    validation_checks: List[str]

class StartTrainingResponse(BaseModel):
    job_id: str
    mlflow_run_id: str

class PromoteModelPayload(BaseModel):
    version: int
    stage: str

# --- Routers ---

# Router for training jobs
router = APIRouter(
    prefix="/training",
    tags=["Training"],
)

# Router for MLflow related endpoints
mlflow_router = APIRouter(
    prefix="/mlflow",
    tags=["MLflow"],
)

# Router for model registry related endpoints
models_router = APIRouter(
    prefix="/models",
    tags=["Models"],
)


# --- Endpoints ---

@router.post("/start", response_model=StartTrainingResponse)
async def start_training(payload: StartTrainingPayload):
    """
    Starts a new model training job and waits for the MLflow run ID.
    """
    job_id = str(uuid.uuid4())
    update_job_status(job_id, "PENDING")

    config = payload.model_dump()
    task = train_job.delay(job_id=job_id, config=config)
    update_job_status(job_id, "QUEUED", task_id=task.id)

    # Wait for the mlflow_run_id to be set by the celery task
    start_time = time.time()
    mlflow_run_id = None
    while time.time() - start_time < 120:  # 2-minute timeout
        res = AsyncResult(task.id, app=celery_app)
        if res.state == 'PROGRESS' and 'mlflow_run_id' in res.info:
            mlflow_run_id = res.info['mlflow_run_id']
            break
        if res.state in ['SUCCESS', 'FAILURE']:
            # Task finished before run_id was found (maybe an error)
            break
        time.sleep(1)

    if not mlflow_run_id:
        # If timeout or task failed early, revoke the task and raise error
        task.revoke(terminate=True)
        update_job_status(job_id, "FAILED", error="Failed to get mlflow_run_id from task.")
        raise HTTPException(status_code=500, detail="Failed to initialize MLflow run.")

    # Update job status with the real run_id
    update_job_status(job_id, "QUEUED", mlflow_run_id=mlflow_run_id)

    return StartTrainingResponse(job_id=job_id, mlflow_run_id=mlflow_run_id)

@router.get("/jobs")
async def list_jobs():
    """
    Lists all training jobs.
    """
    jobs_dir = Path("jobs")
    if not jobs_dir.exists():
        return []

    job_files = jobs_dir.glob("*.json")
    jobs = []
    for job_file in job_files:
        if "_config.json" in job_file.name:
            continue
        with open(job_file, "r") as f:
            try:
                job_data = json.load(f)
                job_data["job_id"] = job_file.stem
                jobs.append(job_data)
            except json.JSONDecodeError:
                continue # Skip corrupted files

    # Sort by timestamp descending
    return sorted(jobs, key=lambda x: x.get("timestamp", ""), reverse=True)

@router.get("/{job_id}")
async def get_job_status(job_id: str):
    """
    Gets the status of a specific training job.
    """
    job_file = Path("jobs") / f"{job_id}.json"
    if not job_file.exists():
        raise HTTPException(status_code=404, detail="Job not found")

    with open(job_file, "r") as f:
        job_data = json.load(f)

    return job_data

@router.post("/{job_id}/stop")
async def stop_training(job_id: str):
    """
    Stops a running training job.
    """
    job_file = Path("jobs") / f"{job_id}.json"
    if not job_file.exists():
        raise HTTPException(status_code=404, detail="Job not found")

    with open(job_file, "r") as f:
        job_data = json.load(f)

    task_id = job_data.get("task_id")
    if not task_id:
        raise HTTPException(status_code=400, detail="Job has no task ID")

    celery_app.control.revoke(task_id, terminate=True)

    update_job_status(job_id, "CANCELLED")

    return {"job_id": job_id, "message": "Job cancellation request sent."}

@router.get("/{job_id}/logs")
async def get_job_logs(job_id: str, tail: Optional[int] = 100):
    """
    Retrieves the logs for a specific training job.
    """
    log_file = Path("jobs") / f"{job_id}.log"
    if not log_file.exists():
        raise HTTPException(status_code=404, detail="Log file not found")

    with open(log_file, "r") as f:
        if tail:
            lines = list(deque(f, tail))
        else:
            lines = f.readlines()

    return {"job_id": job_id, "logs": [line.strip() for line in lines]}

@mlflow_router.get("/experiments")
async def list_mlflow_experiments():
    """
    Lists all MLflow experiments.
    """
    client = MlflowClient()
    experiments = client.search_experiments()
    return [{"id": exp.experiment_id, "name": exp.name} for exp in experiments]

@mlflow_router.get("/runs")
async def list_mlflow_runs(experiment_id: str):
    """
    Lists all runs for a given MLflow experiment ID.
    """
    client = MlflowClient()
    try:
        runs = client.search_runs(experiment_ids=[experiment_id])
        return [{
            "run_id": run.info.run_id,
            "status": run.info.status,
            "start_time": run.info.start_time,
            "end_time": run.info.end_time,
            "metrics": run.data.metrics,
            "params": run.data.params,
            "tags": run.data.tags,
        } for run in runs]
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Experiment '{experiment_id}' not found or error fetching runs: {e}")

@models_router.get("/")
async def list_models():
    """
    Lists all registered models from the MLflow Model Registry.
    """
    client = MlflowClient()
    models = client.search_registered_models()

    response = []
    for model in models:
        for version in model.latest_versions:
            response.append({
                "name": version.name,
                "version": version.version,
                "stage": version.current_stage,
            })
    return response

@models_router.post("/{model_name}/promote")
async def promote_model_endpoint(model_name: str, payload: PromoteModelPayload):
    """
    Promotes a model version to a specific stage in the MLflow Model Registry.
    """
    try:
        # Promote the model in MLflow
        promote_model_util(model_name, payload.version, payload.stage)

        # Get the model URI
        client = MlflowClient()
        model_version_details = client.get_model_version(name=model_name, version=str(payload.version))
        model_uri = model_version_details.source

        # Update the active model config
        active_model_config = {
            "model_name": model_name,
            "version": payload.version,
            "stage": payload.stage,
            "model_uri": model_uri,
            "job_id": model_version_details.run_id,
        }
        with open("Backend/app/llm_active_model.json", "w") as f:
            json.dump(active_model_config, f, indent=4)

        # Reload the model in the LLM service
        reload_model(model_uri)

        return {
            "message": f"Model {model_name} version {payload.version} promoted to {payload.stage} and loaded successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
