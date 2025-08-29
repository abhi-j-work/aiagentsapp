# backend/app/core/mlflow_utils.py
"""
Utilities for interacting with the MLflow server.
"""

import os
import mlflow
from mlflow.tracking import MlflowClient
from dotenv import load_dotenv

# Load environment variables from .env file.
# The .env file should be in the `Backend` directory.
load_dotenv()

def get_mlflow_tracking_uri():
    """
    Returns the MLflow tracking URI from the environment variables.
    Defaults to http://localhost:5000 if not set.
    """
    return os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")

def setup_mlflow():
    """
    Sets up the MLflow tracking URI for the mlflow client.
    """
    tracking_uri = get_mlflow_tracking_uri()
    mlflow.set_tracking_uri(tracking_uri)
    print(f"MLflow tracking URI set to: {tracking_uri}")

def create_or_get_experiment(experiment_name: str) -> str:
    """
    Creates an MLflow experiment if it doesn't exist, or returns the existing one.

    Args:
        experiment_name (str): The name of the experiment.

    Returns:
        str: The ID of the experiment.
    """
    setup_mlflow()
    client = MlflowClient()
    experiment = client.get_experiment_by_name(experiment_name)
    if experiment:
        return experiment.experiment_id
    else:
        experiment_id = client.create_experiment(experiment_name)
        return experiment_id

def register_model(run_id: str, model_name: str):
    """
    Registers a model in the MLflow Model Registry.

    Args:
        run_id (str): The ID of the run where the model was logged.
        model_name (str): The name of the model to register.
    """
    setup_mlflow()
    model_uri = f"runs:/{run_id}/model"
    mlflow.register_model(model_uri=model_uri, name=model_name)
    print(f"Model '{model_name}' registered from run '{run_id}'.")

def promote_model(model_name: str, version: int, stage: str):
    """
    Promotes a model version to a specific stage.

    Args:
        model_name (str): The name of the model.
        version (int): The version of the model.
        stage (str): The stage to promote the model to (e.g., "Staging", "Production").
    """
    setup_mlflow()
    client = MlflowClient()
    client.transition_model_version_stage(
        name=model_name,
        version=version,
        stage=stage,
        archive_existing_versions=True
    )
    print(f"Model '{model_name}' version {version} promoted to '{stage}'.")
