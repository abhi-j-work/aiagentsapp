import React, { useState } from 'react';

const SettingsPanel: React.FC = () => {
  const [model, setModel] = useState(localStorage.getItem('groq_model') || 'llama3-70b-8192');
  const [chunkSize, setChunkSize] = useState(localStorage.getItem('chunk_size') || '4000');
  const [overlap, setOverlap] = useState(localStorage.getItem('overlap') || '200');

  const handleSave = () => {
    // TODO: Implement an API call to a new backend endpoint to save these settings.
    // For now, we'll just save them to localStorage for a mock experience.
    localStorage.setItem('groq_model', model);
    localStorage.setItem('chunk_size', chunkSize);
    localStorage.setItem('overlap', overlap);
    alert('Settings saved to local storage for this browser session.');
  };

  return (
    <div className="glass">
      <div className="section-title">Runtime Controls</div>
      <p>Adjust how the agent processes long documents.</p>

      <div className="form-group">
        <label htmlFor="groq-model">GROQ Model</label>
        <input
          id="groq-model"
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="e.g., llama3-70b-8192"
        />
      </div>

      <div className="form-group">
        <label htmlFor="chunk-size">Chunk Size (characters)</label>
        <input
          id="chunk-size"
          type="number"
          value={chunkSize}
          onChange={(e) => setChunkSize(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="chunk-overlap">Chunk Overlap (characters)</label>
        <input
          id="chunk-overlap"
          type="number"
          value={overlap}
          onChange={(e) => setOverlap(e.target.value)}
        />
      </div>

      <button onClick={handleSave} className="button-primary">
        Save Settings
      </button>
    </div>
  );
};

export default SettingsPanel;
