import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)

def test_start_training_success():
    payload = {
        "job_name": "test_job",
        "base_model": "t5-small",
        "train_file": "data/train.jsonl",
        "val_file": "data/val.jsonl",
        "use_lora": True,
        "hyperparams": {
            "epochs": 1,
            "batch_size": 1,
            "learning_rate": 1e-5,
            "seed": 42
        },
        "mlflow_experiment": "test_experiment",
        "validation_checks": ["json_parse"]
    }
    # Mock the celery task
    with patch('app.api.routers.training.train_job.delay') as mock_delay:
        mock_delay.return_value.id = "mock_task_id"
        response = client.post("/training/start", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert "mlflow_run_id" in data
        mock_delay.assert_called_once()

def test_start_training_invalid_payload():
    payload = {
        "job_name": "test_job",
        # Missing other required fields
    }
    response = client.post("/training/start", json=payload)
    assert response.status_code == 422 # Unprocessable Entity
