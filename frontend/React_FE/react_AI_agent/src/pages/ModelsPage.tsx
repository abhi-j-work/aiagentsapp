import React, { useState, useEffect } from 'react';
import { listModels, promoteModel, ModelVersion } from '../services/api';
import { Button } from '../components/ui/Button';

const ModelsPage = () => {
    const [models, setModels] = useState<ModelVersion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = async () => {
        try {
            const data = await listModels();
            setModels(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch models.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchModels();
    }, []);

    const handlePromote = async (modelName: string, version: number, stage: 'Staging' | 'Production') => {
        if (window.confirm(`Are you sure you want to promote version ${version} of ${modelName} to ${stage}?`)) {
            try {
                await promoteModel(modelName, version, stage);
                fetchModels(); // Refresh the list
            } catch (err: any) {
                alert(`Failed to promote model: ${err.message}`);
            }
        }
    };

    if (isLoading) return <div className="text-white text-center p-8">Loading models...</div>;
    if (error) return <div className="text-red-500 text-center p-8">{error}</div>;

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center p-4">
            <div className="text-center mb-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Model Registry</h1>
                <p className="text-lg text-slate-300 mt-3 max-w-xl mx-auto">View and manage your registered models.</p>
            </div>

            <div className="w-full max-w-4xl glass rounded-2xl p-8 gradient-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-white uppercase bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Model Name</th>
                                <th scope="col" className="px-6 py-3">Version</th>
                                <th scope="col" className="px-6 py-3">Stage</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {models.map((model) => (
                                <tr key={`${model.name}-${model.version}`} className="border-b border-slate-700 hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium text-white">{model.name}</td>
                                    <td className="px-6 py-4">{model.version}</td>
                                    <td className="px-6 py-4">{model.stage}</td>
                                    <td className="px-6 py-4 space-x-2">
                                        {model.stage !== 'Staging' && <Button onClick={() => handlePromote(model.name, model.version, 'Staging')}>Promote to Staging</Button>}
                                        {model.stage !== 'Production' && <Button onClick={() => handlePromote(model.name, model.version, 'Production')}>Promote to Production</Button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ModelsPage;
