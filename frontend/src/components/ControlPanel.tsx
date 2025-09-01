import React, { useState } from 'react';

interface ControlPanelProps {
  onGenerate: (source: { text: string } | { file: File }) => void;
  isLoading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerate, isLoading }) => {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerateClick = () => {
    if (mode === 'upload' && file) {
      onGenerate({ file });
    } else if (mode === 'paste' && text.trim()) {
      onGenerate({ text });
    }
  };

  return (
    <div className="glass control-panel">
      <div className="section-title">Input Document</div>
      <div className="radio-group">
        <label><input type="radio" value="upload" checked={mode === 'upload'} onChange={() => setMode('upload')} /> Upload</label>
        <label><input type="radio" value="paste" checked={mode === 'paste'} onChange={() => setMode('paste')} /> Paste Text</label>
      </div>

      {mode === 'upload' ? (
        <input type="file" accept=".pdf,.txt" onChange={handleFileChange} />
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste scientific text here..."
          rows={10}
        />
      )}

      <div className="rule"></div>
      <button onClick={handleGenerateClick} disabled={isLoading} className="generate-button">
        {isLoading ? 'Processing...' : 'Generate Knowledge Graph'}
      </button>
    </div>
  );
};

export default ControlPanel;