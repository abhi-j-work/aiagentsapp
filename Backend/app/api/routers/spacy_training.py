import uuid
import json
import datetime  # ✅ Import the datetime module
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict

# Import BOTH training functions
from app.jobs.spacy_tasks import train_spacy_model_task, train_spacy_cnn_task

router = APIRouter(
    prefix="/spacy-training",
    tags=["spaCy Model Training"]
)

JOBS_DIR = Path("spacy_jobs")
JOBS_DIR.mkdir(exist_ok=True)

# --- Pydantic Models (no changes here) ---
class TransformerTrainingRequest(BaseModel):
    experiment_name: str = Field("Column_Classification_with_Transformers", description="Name of the MLflow experiment.")
    model_name: str = Field("transformer_column_classifier", description="Name to register the model under.")
    base_model: str = Field("en_core_web_trf", description="Base spaCy transformer model to fine-tune.")

class CnnTrainingRequest(BaseModel):
    experiment_name: str = Field("Column_Classification_with_CNN", description="Name of the MLflow experiment.")
    model_name: str = Field("cnn_column_classifier", description="Name to register the model under.")
    iterations: int = Field(25, description="Number of training iterations.")
    train_split: float = Field(0.8, description="Proportion of data to use for training.", ge=0.1, le=0.9)

class TrainingJobResponse(BaseModel):
    job_id: str
    message: str
    job_type: str

# --- Helper ---
def _get_job_file(job_id: str) -> Path:
    if not job_id.isalnum():
        raise HTTPException(status_code=400, detail="Invalid job ID format.")
    return JOBS_DIR / f"{job_id}.json"

# --- Endpoints ---

@router.post("/start-transformer", response_model=TrainingJobResponse, summary="Start Transformer Model Training")
async def start_transformer_training(params: TransformerTrainingRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4()).replace("-", "")
    job_file = _get_job_file(job_id)

    initial_status = {
        "job_id": job_id, "status": "QUEUED", "job_type": "Transformer",
        "created_at": datetime.datetime.utcnow().isoformat(),  # ✅ Add creation timestamp
        "message": "Transformer training job has been queued.", "params": params.model_dump()
    }
    with open(job_file, "w", encoding="utf-8") as f: json.dump(initial_status, f, indent=4)
    
    background_tasks.add_task(train_spacy_model_task, job_id, params.model_dump())
    
    return TrainingJobResponse(job_id=job_id, message="Transformer training job started.", job_type="Transformer")

@router.post("/start-cnn", response_model=TrainingJobResponse, summary="Start CNN Model Training")
async def start_cnn_training(params: CnnTrainingRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4()).replace("-", "")
    job_file = _get_job_file(job_id)

    initial_status = {
        "job_id": job_id, "status": "QUEUED", "job_type": "CNN",
        "created_at": datetime.datetime.utcnow().isoformat(), # ✅ Add creation timestamp
        "message": "CNN training job has been queued.", "params": params.model_dump()
    }
    with open(job_file, "w", encoding="utf-8") as f: json.dump(initial_status, f, indent=4)

    background_tasks.add_task(train_spacy_cnn_task, job_id, params.model_dump())

    return TrainingJobResponse(job_id=job_id, message="CNN training job started.", job_type="CNN")


@router.get("/jobs", response_model=List[Dict], summary="List All Training Jobs")
async def list_spacy_jobs():
    """
    ✅ MODIFIED: Lists all spaCy training jobs, sorted by creation time (newest first).
    """
    jobs = []
    for job_file in JOBS_DIR.glob("*.json"):
        with open(job_file, "r", encoding="utf-8") as f:
            try:
                job_data = json.load(f)
                # Provide a default for any old jobs that might not have a timestamp
                if "created_at" not in job_data:
                    job_data["created_at"] = "1970-01-01T00:00:00.000000"
                jobs.append(job_data)
            except json.JSONDecodeError:
                # Safely skip corrupted or empty files
                print(f"Warning: Could not decode JSON from {job_file.name}")
                continue

    # Sort the list of job dictionaries by the 'created_at' key in reverse order
    sorted_jobs = sorted(jobs, key=lambda j: j["created_at"], reverse=True)
    return sorted_jobs


@router.get("/jobs/{job_id}", response_model=Dict, summary="Get Job Status")
async def get_spacy_job_status(job_id: str):
    job_file = _get_job_file(job_id)
    if not job_file.exists(): raise HTTPException(status_code=404, detail="Job not found.")
    with open(job_file, "r", encoding="utf-8") as f: return json.load(f)