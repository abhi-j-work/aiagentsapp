import React, { useState, useEffect } from 'react';
import { listJobs, stopTraining, JobStatus } from '../services/api';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

const RunsPage = () => {
    const [jobs, setJobs] = useState<JobStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchJobs = async () => {
        try {
            const data = await listJobs();
            setJobs(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch jobs.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleStopJob = async (jobId: string) => {
        if (window.confirm('Are you sure you want to stop this job?')) {
            try {
                await stopTraining(jobId);
                fetchJobs(); // Refresh the list after stopping
            } catch (err: any) {
                alert(`Failed to stop job: ${err.message}`);
            }
        }
    };

    if (isLoading) return <div className="text-white text-center p-8">Loading training runs...</div>;
    if (error) return <div className="text-red-500 text-center p-8">{error}</div>;

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center p-4">
            <div className="w-full max-w-4xl flex justify-between items-center mb-8 animate-fade-in">
                <div className="text-left">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Training Runs</h1>
                    <p className="text-lg text-slate-300 mt-3">Monitor the status of your model training jobs.</p>
                </div>
                <Link to="/training/start">
                    <Button>Start New Job</Button>
                </Link>
            </div>

            <div className="w-full max-w-4xl glass rounded-2xl p-8 gradient-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-white uppercase bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Job Name</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">MLflow Run</th>
                                <th scope="col" className="px-6 py-3">Created At</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job) => (
                                <tr key={job.job_id} className="border-b border-slate-700 hover:bg-slate-800/50">
                                    <td className="px-6 py-4 font-medium text-white">{job.config?.job_name || job.job_id}</td>
                                    <td className="px-6 py-4">{job.status}</td>
                                    <td className="px-6 py-4">
                                        <a href={`http://localhost:5000/#/experiments/${job.config?.mlflow_experiment}/runs/${job.mlflow_run_id}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                            {job.mlflow_run_id}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4">{job.timestamp ? new Date(job.timestamp).toLocaleString() : 'N/A'}</td>
                                    <td className="px-6 py-4 space-x-2">
                                        <Button onClick={() => handleStopJob(job.job_id)} disabled={['SUCCESS', 'FAILED', 'CANCELLED'].includes(job.status)}>Stop</Button>
                                        {/* A link to a dedicated logs page could be implemented here */}
                                        <Link to={`/training/logs/${job.job_id}`}><Button variant="outline">Logs</Button></Link>
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

export default RunsPage;
