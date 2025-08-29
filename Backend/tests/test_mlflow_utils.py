import pytest
from unittest.mock import patch, MagicMock
from app.core.mlflow_utils import create_or_get_experiment, register_model, promote_model

@patch('app.core.mlflow_utils.MlflowClient')
def test_create_or_get_experiment_exists(MockMlflowClient):
    mock_client_instance = MockMlflowClient.return_value
    mock_experiment = MagicMock()
    mock_experiment.experiment_id = "123"
    mock_client_instance.get_experiment_by_name.return_value = mock_experiment

    experiment_id = create_or_get_experiment("test_experiment")

    mock_client_instance.get_experiment_by_name.assert_called_with("test_experiment")
    mock_client_instance.create_experiment.assert_not_called()
    assert experiment_id == "123"

@patch('app.core.mlflow_utils.MlflowClient')
def test_create_or_get_experiment_not_exists(MockMlflowClient):
    mock_client_instance = MockMlflowClient.return_value
    mock_client_instance.get_experiment_by_name.return_value = None
    mock_client_instance.create_experiment.return_value = "456"

    experiment_id = create_or_get_experiment("new_experiment")

    mock_client_instance.get_experiment_by_name.assert_called_with("new_experiment")
    mock_client_instance.create_experiment.assert_called_with("new_experiment")
    assert experiment_id == "456"

@patch('app.core.mlflow_utils.mlflow')
def test_register_model(mock_mlflow):
    register_model("run123", "my_model")
    mock_mlflow.register_model.assert_called_with(model_uri="runs:/run123/model", name="my_model")

@patch('app.core.mlflow_utils.MlflowClient')
def test_promote_model(MockMlflowClient):
    mock_client_instance = MockMlflowClient.return_value
    promote_model("my_model", 1, "Staging")
    mock_client_instance.transition_model_version_stage.assert_called_with(
        name="my_model",
        version=1,
        stage="Staging",
        archive_existing_versions=True
    )
