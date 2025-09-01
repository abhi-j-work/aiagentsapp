import React, { useState } from 'react';
import { updateSettings } from '../services/api';

const SettingsPanel: React.FC = () => {
  const [model, setModel] = useState('llama3-70b-8192');
  const [chunkSize, setChunkSize] = useState('4000');
  const [overlap, setOverlap] = useState('200');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = {
        groq_model: model,
        chunk_size: parseInt(chunkSize, 10),
        overlap: parseInt(overlap, 10),
      };
      await updateSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. See console for details.');
    }
    setIsSaving(false);
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

      <button onClick={handleSave} className="button-primary" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

export default SettingsPanel;
