import React from 'react';
import type { Incident } from '../../services/api'; 
import './IncidentCard.css';

interface Props {
  incident: Incident;
}

export const IncidentCard: React.FC<Props> = ({ incident }) => {
  return (
    <div className="incident-card">
      <div className="card-header">
        <h3>{incident.ai_diagnosis.summary}</h3>
        <span className="timestamp">{new Date(incident.detected_at).toLocaleString()}</span>
      </div>
      <div className="card-body">
        <details>
          <summary>View Diagnosis & Fix</summary>
          <div className="details-section">
            <h4>Root Cause Analysis</h4>
            <p>{incident.ai_diagnosis.root_cause}</p>
          </div>
          <div className="details-section">
            <h4>Suggested Fix</h4>
            <pre><code>{incident.ai_diagnosis.suggested_fix}</code></pre>
          </div>
          <div className="details-section">
            <h4>Original Error Log</h4>
            <pre className="log-line"><code>{incident.error_log.line}</code></pre>
          </div>
        </details>
      </div>
    </div>
  );
};