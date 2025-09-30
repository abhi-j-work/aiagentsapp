import React, { useState } from 'react';
import type { SpaCyJob } from '../../types/training';
import { LoaderCircle, Copy, Check, BrainCircuit, Zap } from 'lucide-react';

const getStatusColor = (status: SpaCyJob['status']) => {
  // ... (no change here)
};

// ✅ NEW: Helper function to format the date nicely
const formatJobDate = (isoString: string) => {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    // Uses the user's local timezone and a friendly format
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

export const JobsList: React.FC<Props> = ({ jobs, isLoading }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    // ... (no change here)
  };

  if (isLoading && jobs.length === 0) {
    // ... (no change here)
  }

  return (
    <div className="jobs-list">
      <div className="jobs-header">
        <h4>Training Job History</h4>
        <div className="jobs-meta"><span className="muted">{jobs.length} total</span></div>
      </div>

      <div className="table-wrap">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Status</th>
              <th>Type</th>
              <th>Model Name</th>
              <th>Created</th> {/* ✅ Add "Created" header */}
              <th>MLflow Run</th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={7} className="muted">No jobs found — start a training job to see history.</td> {/* ✅ Update colSpan to 7 */}
              </tr>
            ) : (
              jobs.map((job: { job_id: React.Key | null | undefined; status: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; job_type: string; params: any; created_at: string; mlflow_run_id: string; }) => {
                const shortId = job.job_id?.substring(0, 8) ?? 'N/A';
                return (
                  <tr key={job.job_id} className="job-row">
                    <td className="mono" title={job.job_id}>
                      {/* ... (copy button) */}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
                      <span className="type-badge">
                        {job.job_type === 'Transformer' ? <BrainCircuit className="tiny" /> : <Zap className="tiny" />}
                        {job.job_type ?? 'N/A'}
                      </span>
                    </td>
                    <td className="text-muted">{(job.params as any)?.model_name ?? '—'}</td>

                    {/* ✅ Add the formatted date cell */}
                    <td className="text-muted">{formatJobDate(job.created_at)}</td>
                    
                    <td className="mono" title={job.mlflow_run_id || ''}>
                      {job.mlflow_run_id ? `${job.mlflow_run_id.substring(0, 8)}...` : 'N/A'}
                    </td>
                    <td>
                      <button className="row-action" title="View details" aria-label="View job details">Details</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};