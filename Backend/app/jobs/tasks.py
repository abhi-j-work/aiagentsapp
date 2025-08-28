# backend/app/jobs/tasks.py
"""
Celery tasks for the application.
"""
import json
import subprocess
from pathlib import Path
import mlflow
import datetime
from app.core.celery_config import celery_app
from app.core.mlflow_utils import setup_mlflow, create_or_get_experiment

# Directory to store job metadata
JOBS_DIR = Path("jobs")
JOBS_DIR.mkdir(exist_ok=True)

def update_job_status(job_id: str, status: str, **kwargs):
    """
    Updates the status of a job in its JSON file.
    """
    job_file = JOBS_DIR / f"{job_id}.json"
    job_data = {}
    is_new_job = not job_file.exists()

    if not is_new_job:
        with open(job_file, "r") as f:
            try:
                job_data = json.load(f)
            except json.JSONDecodeError:
                job_data = {} # Overwrite if file is corrupted

    if is_new_job:
        job_data["timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    job_data["status"] = status
    job_data.update(kwargs)

    with open(job_file, "w") as f:
        json.dump(job_data, f, indent=4)


@celery_app.task(bind=True)
def train_job(self, job_id: str, config: dict):
    """
    A Celery task to run a model training job.
    """
    print(f"Starting training job: {job_id}")
    update_job_status(job_id, "STARTED", task_id=self.request.id, config=config)

    try:
        # --- MLflow Setup ---
        setup_mlflow()
        experiment_id = create_or_get_experiment(config["mlflow_experiment"])

        with mlflow.start_run(experiment_id=experiment_id, run_name=config["job_name"]) as run:
            run_id = run.info.run_id
            print(f"[{job_id}] MLflow run started with ID: {run_id}")

            # Update Celery task state with the mlflow_run_id
            self.update_state(state='PROGRESS', meta={'mlflow_run_id': run_id})

            update_job_status(job_id, "RUNNING", mlflow_run_id=run_id)

            # Add run_id to config for the training script
            config["mlflow_run_id"] = run_id

            # --- Run Training Script as Subprocess ---
            config_path = JOBS_DIR / f"{job_id}_config.json"
            with open(config_path, "w") as f:
                json.dump(config, f)

            cmd = [
                "python", "-m", "app.training.train",
                "--config", str(config_path)
            ]

            log_path = JOBS_DIR / f"{job_id}.log"
            with open(log_path, "w") as log_file:
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    cwd="Backend" # Run from backend directory
                )
                for line in process.stdout:
                    print(line, end="")
                    log_file.write(line)

            process.wait()

            if process.returncode != 0:
                raise Exception(f"Training script failed with exit code {process.returncode}")

            print(f"[{job_id}] Training completed successfully.")
            update_job_status(job_id, "SUCCESS")
            return {"status": "SUCCESS", "job_id": job_id}

    except Exception as e:
        print(f"[{job_id}] Training failed: {e}")
        update_job_status(job_id, "FAILED", error=str(e))
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise
