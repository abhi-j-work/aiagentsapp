import React from 'react';

const SettingsPanel: React.FC = () => {
  return (
    <div className="glass">
      <div className="section-title">Runtime Controls</div>
      <p>
        In this architecture, runtime settings are configured on the backend server via environment variables.
      </p>
      <p>
        This ensures that all users share the same processing configuration for consistency. To change these settings, you would typically update the environment on the server and restart it.
      </p>

      <div style={{ marginTop: '2rem' }}>
        <strong>Current Settings (Defaults):</strong>
        <ul>
          <li><strong>GROQ Model:</strong> `meta-llama/llama-4-maverick-17b-128e-instruct` (from `GROQ_MODEL` env var)</li>
          <li><strong>Chunk Size:</strong> `4000` characters (from `KG_CHUNK_SIZE` env var)</li>
          <li><strong>Chunk Overlap:</strong> `200` characters (from `KG_CHUNK_OVERLAP` env var)</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem', opacity: 0.7 }}>
        <strong>Suggestion for Future Improvement:</strong>
        <p>
          A future version could implement an API endpoint to allow administrators to update these settings dynamically from this panel without needing to restart the server.
        </p>
      </div>
    </div>
  );
};

export default SettingsPanel;
