import React from 'react';
import { InsightData } from '../types';

interface InsightPanelProps {
  insight: InsightData;
  onPathSelect: (path: string[]) => void;
}

const InsightPanel: React.FC<InsightPanelProps> = ({ insight, onPathSelect }) => {
  if (!insight.found) {
    return (
      <div className="glass insight-panel">
        <div className="section-title">Insights</div>
        <p>No compelling multi-hop paths were discovered in this document.</p>
      </div>
    );
  }

  return (
    <div className="glass insight-panel">
      <div className="section-title">Discovered Insight</div>
      <p className="explanation">{insight.explanation}</p>
      <b>Discovered Causal Paths:</b>
      <div className="path-list">
        {insight.raw_paths.map((path, index) => (
          <div key={index} className="path-item" onClick={() => onPathSelect(path)}>
            <span className="path-score">{insight.scores[index].toFixed(2)}</span>
            {path.join(' → ')}
            {insight.causal_candidates[index] && <span className="causal-badge">Causal</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightPanel;