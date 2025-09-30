import React, { useState, useEffect, useCallback } from 'react';
import { getSpacyJobs } from '../services/api';
import type { SpaCyJob } from '../types/training';
import { StartTrainingForm } from '../components/training/StartTrainingForm';
import { JobsList } from '../components/training/JobList';

// Icons
import { Workflow } from 'lucide-react';

// CSS - import the new glass styles
import '../App.css';

const POLLING_INTERVAL_MS = 5000;

const TrainingPage: React.FC = () => {
  const [jobs, setJobs] = useState<SpaCyJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const jobsData = await getSpacyJobs();
      setJobs(jobsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const intervalId = setInterval(fetchJobs, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchJobs]);

  return (
    <div className="page-container">
      {/* Decorative background rings to mimic the neon frame feel */}
      <div className="bg-decor bg-decor-1" aria-hidden />
      <div className="bg-decor bg-decor-2" aria-hidden />

      <div className="w-full max-w-4xl">
        <div className="neon-frame">
          <div className="glass-card">
            <div className="card-header">
              <div className="title-left">
                <Workflow className="icon" />
                <div>
                  <h1 className="heading">Model Training</h1>
                  <p className="subheading">Start and monitor fine-tuning jobs for your column classification models.</p>
                </div>
              </div>
              <div className="header-cta">
                <span className="hint">Auto-poll every 5s</span>
              </div>
            </div>

            <div className="card-body">
              <div className="panel">
                <StartTrainingForm onJobStarted={fetchJobs} />
              </div>

              <div className="panel panel--padded">
                {error && (
                  <div className="error-bar" role="alert">
                    <strong>Error:</strong> {error}
                  </div>
                )}

                <JobsList jobs={jobs} isLoading={isLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
