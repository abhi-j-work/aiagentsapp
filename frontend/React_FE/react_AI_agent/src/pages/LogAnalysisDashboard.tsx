import React, { useState, useEffect } from 'react';
import { getAiIncidents, type Incident } from '../services/api';
import { IncidentCard } from '../components/log-analysis/IncidentCard';
import { LogExplorer } from '../components/log-analysis/LogExplorer';
import './LogAnalysisDashboard.css';

type View = 'incidents' | 'explorer';

export const LogAnalysisDashboardPage: React.FC = () => {
    const [view, setView] = useState<View>('incidents');
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [incidentCount, setIncidentCount] = useState(0);

    useEffect(() => {
        setIsLoading(true);
        getAiIncidents()
            .then(data => {
                setIncidents(data);
                setIncidentCount(data.length);
            })
            .catch(err => setError(err.message || 'Failed to connect to the analysis service.'))
            .finally(() => setIsLoading(false));

        const poller = setInterval(() => {
            getAiIncidents().then(data => {
                // Only update state if new incidents have arrived to avoid jarring refreshes
                if (data.length !== incidentCount) {
                    setIncidents(data);
                    setIncidentCount(data.length);
                }
            });
        }, 15000); // Poll every 15 seconds

        return () => clearInterval(poller);
    }, [incidentCount]); // Rerun effect only if count changes (or on mount)

    const renderIncidentsView = () => {
        if (isLoading) return <p className="status-message">Loading AI Incidents...</p>;
        if (error) return <p className="status-message error">{error}</p>;
        return (
            <>
                <h2>AI Incident Feed</h2>
                <p>This feed automatically shows AI-analyzed errors from your application logs.</p>
                {incidents.length > 0 ? (
                    incidents.map(inc => <IncidentCard key={inc.incident_id} incident={inc} />)
                ) : (
                    <p className="status-message">No recent incidents detected. System appears healthy.</p>
                )}
            </>
        );
    };

    return (
        <div className="log-dashboard-page">
            <div className="dashboard-header">
                <h1>Log Analysis & AI Operations</h1>
                <div className="view-switcher">
                    <button onClick={() => setView('incidents')} className={view === 'incidents' ? 'active' : ''}>
                        AI Incidents {incidentCount > 0 && <span className="badge">{incidentCount}</span>}
                    </button>
                    <button onClick={() => setView('explorer')} className={view === 'explorer' ? 'active' : ''}>
                        Log Explorer
                    </button>
                </div>
            </div>
            <div className="dashboard-content">
                {view === 'incidents' ? renderIncidentsView() : <LogExplorer />}
            </div>
        </div>
    );
};