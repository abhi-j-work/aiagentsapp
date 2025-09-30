import json
import random
import spacy
import traceback
from pathlib import Path
from spacy.tokens import DocBin
from spacy.training.example import Example  # <-- Added for CNN task
from spacy.cli.train import train as spacy_train

import mlflow
from app.core import mlflow_utils
from app.core.config import get_settings

# ==============================================================================
# SHARED UTILITIES (Used by both Transformer and CNN tasks)
# ==============================================================================

JOBS_DIR = Path("spacy_jobs")
JOBS_DIR.mkdir(exist_ok=True)

def load_training_data(data_dir: str):
    """Loads training data from JSON/JSONL files in a folder."""
    data_dir = Path(data_dir)
    if not data_dir.exists() or not data_dir.is_dir():
        raise ValueError(f"Training data directory not found: {data_dir}")

    all_data = []
    for file in data_dir.glob("*.json*"):
        with open(file, "r", encoding="utf-8") as f:
            if file.suffix == ".jsonl":
                for line in f:
                    all_data.append(json.loads(line))
            else:
                loaded = json.load(f)
                if isinstance(loaded, list):
                    all_data.extend(loaded)
                else:
                    all_data.append(loaded)

    formatted = []
    for item in all_data:
        if isinstance(item, (list, tuple)):
            formatted.append(tuple(item))
        elif isinstance(item, dict) and "text" in item and "cats" in item:
            formatted.append((item["text"], {"cats": item["cats"]}))
        else:
            raise ValueError(f"Invalid training data format: {item}")
    return formatted

def update_job_status(job_id: str, status: str, message: str, mlflow_run_id: str = None):
    """Updates the status of a training job in its JSON file."""
    job_file = JOBS_DIR / f"{job_id}.json"
    try:
        with open(job_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {"job_id": job_id}

    data["status"] = status
    data["message"] = message
    if mlflow_run_id:
        data["mlflow_run_id"] = mlflow_run_id
    with open(job_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)


# ==============================================================================
# TASK 1: Transformer Model Training
# ==============================================================================

def train_spacy_model_task(job_id: str, config: dict):
    """
    The main background task to train a spaCy TRANSFORMER model.
    """
    try:
        update_job_status(job_id, "RUNNING", "Starting Transformer training process...")
        settings = get_settings()
        all_data = load_training_data(settings.TRAINING_DATA_DIR)
        categories = {cat for _, ann in all_data for cat in ann["cats"].keys()}

        mlflow_utils.setup_mlflow()
        experiment_id = mlflow_utils.create_or_get_experiment(config["experiment_name"])

        with mlflow.start_run(experiment_id=experiment_id, run_name=f"spacy-run-{job_id}") as run:
            run_id = run.info.run_id
            update_job_status(job_id, "RUNNING", "MLflow run started.", mlflow_run_id=run_id)
            mlflow.log_params(config)

            random.shuffle(all_data)
            split_point = int(len(all_data) * 0.8)
            train_data, eval_data = all_data[:split_point], all_data[split_point:]

            nlp = spacy.blank("en")
            db_train = DocBin()
            for text, ann in train_data:
                doc = nlp.make_doc(text)
                doc.cats = {**{cat: 0.0 for cat in categories}, **ann["cats"]}
                db_train.add(doc)
            train_path = JOBS_DIR / f"{job_id}_train.spacy"
            db_train.to_disk(train_path)

            db_eval = DocBin()
            for text, ann in eval_data:
                doc = nlp.make_doc(text)
                doc.cats = {**{cat: 0.0 for cat in categories}, **ann["cats"]}
                db_eval.add(doc)
            eval_path = JOBS_DIR / f"{job_id}_eval.spacy"
            db_eval.to_disk(eval_path)

            config_str = f"""
            [paths]
            train = "{train_path}"
            dev = "{eval_path}"
            [nlp]
            lang = "en"
            pipeline = ["transformer", "textcat"]
            batch_size = 128
            [components]
            [components.transformer]
            factory = "transformer"
            [components.transformer.model]
            @architectures = "spacy-transformers.TransformerModel.v3"
            name = "{config['base_model']}"
            [components.textcat]
            factory = "textcat"
            [training]
            dev_corpus = "paths.dev"
            train_corpus = "paths.train"
            [training.optimizer]
            @optimizers = "Adam.v1"
            """
            config_path = JOBS_DIR / f"{job_id}_config.cfg"
            with open(config_path, "w", encoding="utf-8") as f:
                f.write(config_str.strip())
            mlflow.log_artifact(str(config_path), "training_config")
            
            update_job_status(job_id, "RUNNING", "Fine-tuning transformer model...")
            output_dir = JOBS_DIR / f"{job_id}_output"
            spacy_train(config_path, output_path=output_dir)

            with open(output_dir / "model-best" / "meta.json", "r", encoding="utf-8") as f:
                meta = json.load(f)
                scores = meta.get("performance", {})
                mlflow.log_metrics({
                    "accuracy": scores.get("cats_macro_auc", 0),
                    "precision": scores.get("cats_macro_p", 0),
                    "recall": scores.get("cats_macro_r", 0),
                    "f1_score": scores.get("cats_macro_f", 0),
                })

            best_model = spacy.load(output_dir / "model-best")
            mlflow.spacy.log_model(spacy_model=best_model, artifact_path="model")
            mlflow_utils.register_model(run_id, config["model_name"])

            update_job_status(job_id, "COMPLETED", f"Transformer trained and registered as '{config['model_name']}'.")

    except Exception as e:
        print(f"--- TRANSFORMER TRAINING FAILED ---\n{traceback.format_exc()}\n-----------------------")
        update_job_status(job_id, "FAILED", f"Training failed: {str(e)}")
        raise

# ==============================================================================
# TASK 2: CNN Model Training (NEW)
# ==============================================================================

def _evaluate_cnn_model(nlp, eval_data):
    """Helper to calculate accuracy for the simple CNN model."""
    correct_predictions = 0
    total_predictions = len(eval_data)
    if total_predictions == 0:
        return 0.0
    for text, annotations in eval_data:
        doc = nlp(text)
        true_label = max(annotations['cats'], key=annotations['cats'].get)
        predicted_label = max(doc.cats, key=doc.cats.get)
        if predicted_label == true_label:
            correct_predictions += 1
    return correct_predictions / total_predictions

def train_spacy_cnn_task(job_id: str, config: dict):
    """
    Background task to train a spaCy CNN text classifier using a manual training loop.
    """
    try:
        update_job_status(job_id, "RUNNING", "Starting CNN training process...")

        settings = get_settings()
        all_data = load_training_data(settings.TRAINING_DATA_DIR)
        categories = sorted({cat for _, ann in all_data for cat in ann["cats"].keys()})

        mlflow_utils.setup_mlflow()
        experiment_id = mlflow_utils.create_or_get_experiment(config["experiment_name"])

        with mlflow.start_run(experiment_id=experiment_id, run_name=f"cnn-run-{job_id}") as run:
            run_id = run.info.run_id
            update_job_status(job_id, "RUNNING", "MLflow run started.", mlflow_run_id=run_id)
            mlflow.log_params(config)

            random.shuffle(all_data)
            split_point = int(len(all_data) * config["train_split"])
            train_data, eval_data = all_data[:split_point], all_data[split_point:]

            nlp = spacy.blank("en")
            textcat = nlp.add_pipe("textcat")
            for category in categories:
                textcat.add_label(category)

            update_job_status(job_id, "RUNNING", "Training CNN model...")
            nlp.begin_training()
            final_loss = 0.0
            for i in range(config["iterations"]):
                random.shuffle(train_data)
                losses = {}
                examples = [Example.from_dict(nlp.make_doc(text), annots) for text, annots in train_data]
                nlp.update(examples, losses=losses)
                final_loss = losses.get('textcat', 0.0)
            
            update_job_status(job_id, "RUNNING", "Evaluating model and logging metrics...")
            accuracy = _evaluate_cnn_model(nlp, eval_data)
            mlflow.log_metric("final_loss", final_loss)
            mlflow.log_metric("accuracy", accuracy)

            mlflow.spacy.log_model(spacy_model=nlp, artifact_path="model")
            mlflow_utils.register_model(run_id, config["model_name"])

            update_job_status(job_id, "COMPLETED", f"CNN Model trained and registered as '{config['model_name']}'.")

    except Exception as e:
        print(f"--- CNN TRAINING FAILED ---\n{traceback.format_exc()}\n-----------------------")
        update_job_status(job_id, "FAILED", f"Training failed: {str(e)}")
        raise