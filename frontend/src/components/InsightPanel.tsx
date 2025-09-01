import React, { useState } from 'react';
import { InsightData, GraphData, ExperimentData, fetchExperiment } from '../services/api';

interface InsightPanelProps {
  insightData: InsightData;
  graphData: GraphData;
  rawText: string;
  setHighlightedPath: (path: { nodes: string[]; pairs: string[][] } | null) => void;
}

const InsightPanel: React.FC<InsightPanelProps> = ({ insightData, rawText, setHighlightedPath }) => {
  const [selectedPath, setSelectedPath] = useState<string>(insightData.paths[0] || '');
  const [experimentData, setExperimentData] = useState<ExperimentData | null>(null);
  const [isExpLoading, setIsExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  const handlePathClick = (path: string[]) => {
    const pairs = path.map((node, i) => i < path.length - 1 ? [node, path[i+1]] : []).filter(p => p.length > 0) as string[][];
    setHighlightedPath({ nodes: [...new Set(path)], pairs });
  };

  const handleGenerateExperiment = async () => {
    if (!selectedPath) return;

    const rawPath = insightData.raw_paths.find(p => p.join(' → ') === selectedPath);
    if (!rawPath) return;

    setIsExpLoading(true);
    setExpError(null);
    setExperimentData(null);
    try {
      const data = await fetchExperiment(rawPath, rawText);
      setExperimentData(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to generate experiment.';
      setExpError(errorMessage);
    } finally {
      setIsExpLoading(false);
    }
  };

  return (
    <div className="glass">
      <div className="section-title">Discovered Insight</div>
      <p><i>{insightData.explanation}</i></p>

      <b>Discovered path(s):</b>
      {insightData.raw_paths.map((path, index) => (
        <pre
            key={index}
            onClick={() => handlePathClick(path)}
            style={{cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.2s ease'}}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-accent)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
        >
            {path.join(' → ')}
        </pre>
      ))}

      <div className="rule"></div>
      <div className="section-title">Design Experiment from Path</div>
      <select
        value={selectedPath}
        onChange={(e) => setSelectedPath(e.target.value)}
        style={{ marginBottom: '1rem' }}
      >
        {insightData.paths.map((p, i) => <option key={i} value={p}>{p}</option>)}
      </select>

      <button onClick={handleGenerateExperiment} disabled={isExpLoading} className="primary">
        {isExpLoading ? 'Designing...' : 'Design Experiment for Selected Path'}
      </button>

      {expError && <p style={{color: '#f87171'}}>{expError}</p>}

      {experimentData && (
        <div style={{marginTop: '1rem'}}>
          <details>
            <summary>Suggested Experiment Blueprint</summary>
            {experimentData.parsed_json ? (
              <pre>{JSON.stringify(experimentData.parsed_json, null, 2)}</pre>
            ) : (
              <pre>{experimentData.llm_response || "No response text."}</pre>
            )}
          </details>
          <details>
            <summary>Raw LLM Response</summary>
            <pre>{experimentData.llm_response || "N/A"}</pre>
          </details>
          <details>
            <summary>LLM Prompt</summary>
            <pre>{experimentData.prompt}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default InsightPanel;
