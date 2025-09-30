// src/types/training.ts

// --- Parameter types for starting jobs ---

export interface StartTransformerParams {
  experiment_name: string;
  model_name: string;
  base_model: string;
}

export interface StartCnnParams {
  experiment_name: string;
  model_name: string;
  iterations: number;
  train_split: number;
}

// --- Response type from the backend when starting any job ---

export interface StartTrainingResponse {
  job_id: string;
  message: string;
  job_type: 'Transformer' | 'CNN';
}

// --- The main Job object, which now includes job_type ---

// ... (other type definitions)

export interface SpaCyJob {
  job_id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  message: string;
  params: StartTransformerParams | StartCnnParams;
  mlflow_run_id?: string;
  job_type: 'Transformer' | 'CNN';
  created_at: string; // ✅ Add the new property
}