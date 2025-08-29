# backend/app/training/train.py
"""
Main script for model training.
"""
import argparse
import json
import os
from pathlib import Path
import torch
import mlflow
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, TrainingArguments, Trainer, DataCollatorForSeq2Seq
from peft import get_peft_model, LoraConfig, TaskType

# Assuming validators.py is in the same directory
from .validators import validate_json_outputs, sql_static_check

def train(config: dict):
    """
    Main training function.
    """
    # --- MLflow Setup ---
    # The run should be started by the calling process (e.g., Celery task)
    # and the script should run within that context.

    print("Starting training script with config:", config)

    # Log parameters
    mlflow.log_params(config["hyperparams"])
    mlflow.log_param("base_model", config["base_model"])
    mlflow.log_param("use_lora", config["use_lora"])

    # --- Load Datasets ---
    print("Loading datasets...")
    train_dataset = load_dataset("json", data_files=config["train_file"], split="train")
    val_dataset = load_dataset("json", data_files=config["val_file"], split="train")

    # --- Tokenizer ---
    print("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(config["base_model"])

    def preprocess_function(examples):
        inputs = [ex for ex in examples["input"]]
        targets = [ex for ex in examples["target"]]
        model_inputs = tokenizer(inputs, max_length=512, truncation=True, padding="max_length")
        labels = tokenizer(targets, max_length=128, truncation=True, padding="max_length")
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    print("Tokenizing datasets...")
    tokenized_train_dataset = train_dataset.map(preprocess_function, batched=True)
    tokenized_val_dataset = val_dataset.map(preprocess_function, batched=True)

    # --- Model ---
    print("Loading model...")
    model = AutoModelForSeq2SeqLM.from_pretrained(config["base_model"])

    if config.get("use_lora", False):
        print("Using LoRA...")
        lora_config = LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=["q", "v"],
            lora_dropout=0.05,
            bias="none",
            task_type=TaskType.SEQ_2_SEQ_LM
        )
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()

    # --- Training ---
    output_dir = Path("./training_output")
    output_dir.mkdir(exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=config["hyperparams"]["epochs"],
        per_device_train_batch_size=config["hyperparams"]["batch_size"],
        per_device_eval_batch_size=config["hyperparams"]["batch_size"],
        learning_rate=config["hyperparams"]["learning_rate"],
        seed=config["hyperparams"]["seed"],
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        report_to="mlflow", # Integrate with MLflow
        logging_dir=str(output_dir / "logs"),
    )

    data_collator = DataCollatorForSeq2Seq(tokenizer, model=model)

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_train_dataset,
        eval_dataset=tokenized_val_dataset,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    print("Starting trainer...")
    trainer.train()

    print("Saving model...")
    final_model_dir = output_dir / "final_model"
    trainer.save_model(str(final_model_dir))
    mlflow.log_artifact(str(final_model_dir), artifact_path="model")

    # --- Post-training Validation ---
    print("Running post-training validation...")

    # Generate predictions
    predictions = trainer.predict(tokenized_val_dataset)
    decoded_preds = tokenizer.batch_decode(predictions.predictions, skip_special_tokens=True)

    # Save predictions artifact
    predictions_path = output_dir / "validation_predictions.jsonl"
    with open(predictions_path, "w") as f:
        for pred in decoded_preds:
            f.write(json.dumps({"prediction": pred}) + "\n")
    mlflow.log_artifact(str(predictions_path))

    # Run validators
    validation_results = {}
    if "json_parse" in config["validation_checks"]:
        json_val_results = validate_json_outputs(decoded_preds)
        validation_results.update(json_val_results)

    if "sql_static_check" in config["validation_checks"]:
        sql_preds = [p for p in decoded_preds if "SELECT" in p.upper()]
        if sql_preds:
            pass_rate = sum(sql_static_check(p) for p in sql_preds) / len(sql_preds)
            validation_results["sql_static_pass_rate"] = pass_rate
        else:
            validation_results["sql_static_pass_rate"] = 0.0

    print("Logging validation metrics:", validation_results)
    mlflow.log_metrics(validation_results)

    # Check thresholds and fail run if needed
    # (Implementation of thresholds to be added later)

    print("Training script finished.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, required=True, help="Path to config JSON file")
    args = parser.parse_args()

    with open(args.config, "r") as f:
        config_data = json.load(f)

    # MLflow run should be started by the parent process (celery task)
    # The train.py is executed as a subprocess.
    # We need to get the run_id from the environment or config.
    # For now, we assume the celery task sets up the MLflow run.
    train(config_data)
