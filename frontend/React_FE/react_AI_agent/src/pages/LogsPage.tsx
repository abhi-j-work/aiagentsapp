import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getJobLogs } from '../services/api';

const LogsPage = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const [logs, setLogs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const logsEndRef = useRef<null | HTMLDivElement>(null);

    const fetchLogs = async () => {
        if (!jobId) return;
        try {
            const data = await getJobLogs(jobId, 1000); // Get up to 1000 lines
            setLogs(data.logs);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch logs.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, [jobId]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    if (isLoading) return <div className="text-white text-center p-8">Loading logs...</div>;
    if (error) return <div className="text-red-500 text-center p-8">{error}</div>;

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center p-4">
            <div className="text-center mb-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Logs for Job: {jobId}</h1>
            </div>
            <div className="w-full max-w-4xl h-[60vh] glass rounded-2xl p-4 gradient-border overflow-y-auto bg-slate-900/50">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                    {logs.join('\n')}
                </pre>
                <div ref={logsEndRef} />
            </div>
        </div>
    );
};

export default LogsPage;
