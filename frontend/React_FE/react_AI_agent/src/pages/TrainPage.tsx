import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startTraining, listExperiments, type StartTrainingPayload, type MlflowExperiment } from '../services/api';
import Button from '../components/ui/Button';

const BASE_MODELS = ['t5-small', 't5-base', 'google/flan-t5-small', 'google/flan-t5-base'];

const TrainPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [experiments, setExperiments] = useState<MlflowExperiment[]>([]);
    const [formData, setFormData] = useState<StartTrainingPayload>({
        job_name: 'my-training-job',
        base_model: 't5-small',
        train_file: 'data/smoke_train.jsonl',
        val_file: 'data/smoke_val.jsonl',
        use_lora: true,
        mlflow_experiment: 'Default',
        validation_checks: ['json_parse', 'sql_static_check'],
        hyperparams: {
            epochs: 1,
            batch_size: 2,
            learning_rate: 5e-5,
            seed: 42,
        },
    });

    useEffect(() => {
        const fetchExperiments = async () => {
            try {
                const data = await listExperiments();
                setExperiments(data);
                if (data.length > 0) {
                    setFormData(prev => ({ ...prev, mlflow_experiment: data[0].name }));
                }
            } catch (err: any) {
                setError('Failed to fetch MLflow experiments.');
            }
        };
        fetchExperiments();
    }, []);

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
                        <select name="base_model" id="base_model" value={formData.base_model} onChange={handleInputChange} className="mt-1 block w-full bg-slate-700/50 border-slate-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            {BASE_MODELS.map(model => <option key={model} value={model}>{model}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="mlflow_experiment" className="block text-sm font-medium text-white">MLflow Experiment</label>
                        <select name="mlflow_experiment" id="mlflow_experiment" value={formData.mlflow_experiment} onChange={handleInputChange} className="mt-1 block w-full bg-slate-700/50 border-slate-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            {experiments.map(exp => <option key={exp.id} value={exp.name}>{exp.name}</option>)}
                        </select>
                    </div>

                    {/* Data Files */}
                    <fieldset className="border-t border-slate-600 pt-6">
                        <legend className="text-lg font-medium text-white">Data Files</legend>
                        <div className="grid grid-cols-1 gap-4 mt-4">
                            <div>
                                <label htmlFor="train_file" className="block text-sm font-medium text-white">Training File Path</label>
                                <input type="text" name="train_file" id="train_file" value={formData.train_file} onChange={handleInputChange} className="mt-1 block w-full bg-slate-700/50 border-slate-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="val_file" className="block text-sm font-medium text-white">Validation File Path</label>
                                <input type="text" name="val_file" id="val_file" value={formData.val_file} onChange={handleInputChange} className="mt-1 block w-full bg-slate-700/50 border-slate-600 rounded-md shadow-sm text-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                            </div>
                        </div>
                    </fieldset>

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
