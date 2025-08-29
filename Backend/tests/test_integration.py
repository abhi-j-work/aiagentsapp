import pytest
import json
from pathlib import Path
import mlflow
from app.training.train import train

def test_integration_smoke():
    # This test requires MLflow to be running.
    # It also requires the dummy data files to be present.

    config = {
        "job_name": "smoke_test_job",
        "base_model": "t5-small",
        "train_file": "data/smoke_train.jsonl",
        "val_file": "data/smoke_val.jsonl",
        "use_lora": False,
        "hyperparams": {
            "epochs": 1,
            "batch_size": 1,
            "learning_rate": 1e-5,
            "seed": 42
        },
        "mlflow_experiment": "smoke_test_experiment",
        "validation_checks": []
    }

    mlflow.set_experiment(config["mlflow_experiment"])
    with mlflow.start_run() as run:
        train(config)
        run_id = run.info.run_id

        # Check that the run exists in MLflow
        client = mlflow.tracking.MlflowClient()
        mlflow_run = client.get_run(run_id)
        assert mlflow_run is not None

        # Check for artifacts
        artifacts = client.list_artifacts(run_id)
        artifact_paths = [a.path for a in artifacts]
        assert "model" in artifact_paths
        assert "validation_predictions.jsonl" in artifact_paths
