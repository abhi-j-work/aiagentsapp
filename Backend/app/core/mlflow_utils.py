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
    This function includes a safe, robust workaround for a common issue in containerized
    setups where the default artifact location is not writable by the client container.

    Args:
        experiment_name (str): The name of the experiment.

    Returns:
        str: The ID of the experiment.
    """
    setup_mlflow()
    client = MlflowClient()
    
    # Use a configurable, writable artifact root. This avoids hardcoding paths
    # and provides a non-root default that works in the container.
    # It can be set via the `MLFLOW_ARTIFACT_ROOT` environment variable.
    artifact_root = os.getenv("MLFLOW_ARTIFACT_ROOT", "/workspaces/aiagentsapp/mlruns_artifacts")
    correct_artifact_location = f"{artifact_root}/{experiment_name}"

    experiment = client.get_experiment_by_name(experiment_name)

    if experiment:
        # The artifact location is immutable after creation.
        if experiment.artifact_location != correct_artifact_location:
            print("---")
            print("WARNING: MLflow Experiment Misconfiguration Detected!")
            print(f"The existing experiment '{experiment_name}' has an artifact location of '{experiment.artifact_location}'.")
            print(f"This may not be writable by the current container, leading to a PermissionError.")
            print(f"The recommended location is '{correct_artifact_location}'.")
            print("To fix this, please delete the experiment via the MLflow UI or CLI and let this script recreate it.")
            print("---")
        return experiment.experiment_id
    else:
        print(f"Creating new experiment '{experiment_name}' with artifact location: '{correct_artifact_location}'")
        experiment_id = client.create_experiment(
            experiment_name, artifact_location=correct_artifact_location
        )
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
