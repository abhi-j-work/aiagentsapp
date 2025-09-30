// src/components/training/StartTrainingForm.tsx

import React, { useState } from 'react';
import { startTransformerTraining, startCnnTraining } from '../../services/api';
import type { StartTransformerParams, StartCnnParams } from '../../types/training';
import { PlayCircle, LoaderCircle, BrainCircuit, Zap } from 'lucide-react';

interface Props {
  onJobStarted: () => void;
}

type ModelType = 'transformer' | 'cnn';

export const StartTrainingForm: React.FC<Props> = ({ onJobStarted }) => {
  const [modelType, setModelType] = useState<ModelType>('transformer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transformerParams, setTransformerParams] = useState<StartTransformerParams>({
    experiment_name: 'Column_Classification_with_Transformers',
    model_name: 'transformer_column_classifier',
    base_model: 'en_core_web_trf',
  });

  const [cnnParams, setCnnParams] = useState<StartCnnParams>({
    experiment_name: 'Column_Classification_with_CNN',
    model_name: 'cnn_column_classifier',
    iterations: 25,
    train_split: 0.8,
  });

  const handleTransformerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransformerParams({ ...transformerParams, [e.target.name]: e.target.value });
  };

  const handleCnnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setCnnParams({
      ...cnnParams,
      [name]: type === 'number' ? parseFloat(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (modelType === 'transformer') {
        await startTransformerTraining(transformerParams);
      } else {
        await startCnnTraining(cnnParams);
      }
      onJobStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="start-form" aria-labelledby="form-title">
      <h3 id="form-title" className="form-title">Start a New Training Job</h3>

      {/* Model Type Selector (Tabs) */}
      <div className="tab-group">
        <button
          type="button"
          role="tab"
          aria-selected={modelType === 'transformer'}
          onClick={() => setModelType('transformer')}
          className={`tab ${modelType === 'transformer' ? 'tab--active' : ''}`}
        >
          <BrainCircuit className="btn-icon" /> Transformer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modelType === 'cnn'}
          onClick={() => setModelType('cnn')}
          className={`tab ${modelType === 'cnn' ? 'tab--active' : ''}`}
        >
          <Zap className="btn-icon" /> CNN
        </button>
      </div>

      {/* Conditional Form Inputs */}
      <div className="form-fields">
        {modelType === 'transformer' ? (
          <>
            <div className="form-group">
              <label htmlFor="exp-name-trf">Experiment Name</label>
              <input id="exp-name-trf" name="experiment_name" value={transformerParams.experiment_name} onChange={handleTransformerChange} />
            </div>
            <div className="form-group">
              <label htmlFor="model-name-trf">Model Name</label>
              <input id="model-name-trf" name="model_name" value={transformerParams.model_name} onChange={handleTransformerChange} />
            </div>
            <div className="form-group">
              <label htmlFor="base-model-trf">Base Model</label>
              <input id="base-model-trf" name="base_model" value={transformerParams.base_model} onChange={handleTransformerChange} />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label htmlFor="exp-name-cnn">Experiment Name</label>
              <input id="exp-name-cnn" name="experiment_name" value={cnnParams.experiment_name} onChange={handleCnnChange} />
            </div>
            <div className="form-group">
              <label htmlFor="model-name-cnn">Model Name</label>
              <input id="model-name-cnn" name="model_name" value={cnnParams.model_name} onChange={handleCnnChange} />
            </div>
            <div className="form-group">
              <label htmlFor="iterations-cnn">Iterations</label>
              <input id="iterations-cnn" name="iterations" type="number" value={cnnParams.iterations} onChange={handleCnnChange} />
            </div>
          </>
        )}
      </div>

      <button type="submit" disabled={isLoading} className="btn-primary" aria-disabled={isLoading}>
        {isLoading ? <LoaderCircle className="btn-icon spin" /> : <PlayCircle className="btn-icon" />}
        <span>{isLoading ? 'Starting Job...' : `Start ${modelType.toUpperCase()} Training`}</span>
      </button>

      {error && <div className="form-error" role="alert">{error}</div>}
    </form>
  );
};