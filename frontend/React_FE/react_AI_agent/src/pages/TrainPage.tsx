import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startTraining, StartTrainingPayload } from '../services/api';
import { Button } from '../components/ui/Button';

const TrainPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<StartTrainingPayload>({
        job_name: 'my-training-job',
        base_model: 't5-small',
        train_file: 'data/train.jsonl',
        val_file: 'data/val.jsonl',
        use_lora: true,
        mlflow_experiment: 'Default',
        validation_checks: ['json_parse', 'sql_static_check'],
        hyperparams: {
            epochs: 3,
            batch_size: 8,
            learning_rate: 5e-5,
            seed: 42,
        },
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isHyperparam = Object.keys(formData.hyperparams).includes(name);

        if (isHyperparam) {
            setFormData(prev => ({
                ...prev,
                hyperparams: { ...prev.hyperparams, [name]: type === 'number' ? parseFloat(value) : value },
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const response = await startTraining(formData);
            console.log('Training started:', response);
            navigate('/training/runs');
        } catch (err: any) {
            setError(err.message || 'Failed to start training job.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
            <div className="text-center mb-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Start a New Training Job</h1>
                <p className="text-lg text-slate-300 mt-3 max-w-xl mx-auto">Configure and launch a new model training run.</p>
            </div>
            <div className="w-full max-w-2xl">
                <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6 gradient-border">
                    {/* Job Details */}
                    <div>
                        <label htmlFor="job_name" className="block text-sm font-medium text-white">Job Name</label>
                        <input type="text" name="job_name" id="job_name" value={formData.job_name} onChange={handleInputChange} className="mt-1 block w-full bg-slate-700/50 border-slate-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="base_model" className="block text-sm font-medium text-white">Base Model</label>
                        <input type="text" name="base_model" id="base_model" value={formData.base_model} onChange={handleInputChange} className="mt-1 block w-full bg-slate-700/50 border-slate-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="mlflow_experiment" className="block text-sm font-medium text-white">MLflow Experiment</label>
                        <input type="text" name="mlflow_experiment" id="mlflow_experiment" value={formData.mlflow_experiment} onChange={handleInputChange} className="mt-1 block w-full bg-slate-700/50 border-slate-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>

                    {/* Hyperparameters */}
                    <fieldset className="border-t border-slate-600 pt-6">
                        <legend className="text-lg font-medium text-white">Hyperparameters</legend>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            {Object.entries(formData.hyperparams).map(([key, value]) => (
                                <div key={key}>
                                    <label htmlFor={key} className="block text-sm font-medium text-white capitalize">{key.replace('_', ' ')}</label>
                                    <input type="number" name={key} id={key} value={value} onChange={handleInputChange} step={key === 'learning_rate' ? '0.00001' : '1'} className="mt-1 block w-full bg-slate-700/50 border-slate-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                </div>
                            ))}
                        </div>
                    </fieldset>

                    <div className="flex items-center">
                        <input id="use_lora" name="use_lora" type="checkbox" checked={formData.use_lora} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        <label htmlFor="use_lora" className="ml-2 block text-sm text-white">Use LoRA</label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-6 border-t border-slate-600">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Starting...' : 'Start Training'}
                        </Button>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                </form>
            </div>
        </div>
    );
};

export default TrainPage;
