import React, { useState } from 'react';
import styled from 'styled-components';
import type { Insight, ExperimentResponse } from '../types';
import { designExperiment } from '../services/api';
import { useGraph } from '../contexts/GraphContext';

const DesignerContainer = styled.div`
  margin-top: 1.5rem;
`;

const Select = styled.select`
  margin-bottom: 1rem;
`;

const SmallButton = styled.button`
  border-radius: 10px;
  padding: 0.5rem 0.8rem;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  color: #0b0f13;
  border: 0;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.08);
  }

  &:disabled {
    cursor: not-allowed;
    background: #555;
    color: #999;
  }
`;

const ResultsContainer = styled.div`
  margin-top: 1rem;
  background: rgba(0,0,0,0.2);
  border-radius: 8px;
  padding: 1rem;
`;

const JsonViewer = styled.pre`
  background: rgba(0,0,0,0.3);
  padding: 1rem;
  border-radius: 8px;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 13px;
  max-height: 400px;
  overflow-y: auto;
`;

interface ExperimentDesignerProps {
  insight: Insight;
}

const ExperimentDesigner: React.FC<ExperimentDesignerProps> = ({ insight }) => {
  const [selectedPath, setSelectedPath] = useState<string>(insight.paths?.[0] || '');
  const [experiment, setExperiment] = useState<ExperimentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { rawText } = useGraph();

  const handleDesign = async () => {
    if (!selectedPath) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await designExperiment({ path: selectedPath, context: rawText });
      setExperiment(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to design experiment.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!insight.paths || insight.paths.length === 0) {
    return null;
  }

  return (
    <DesignerContainer>
      <div className="section-title">Design experiment from discovered path</div>
      <Select value={selectedPath} onChange={e => setSelectedPath(e.target.value)}>
        {insight.paths.map((p, i) => (
          <option key={i} value={p}>{p}</option>
        ))}
      </Select>
      <SmallButton onClick={handleDesign} disabled={isLoading}>
        {isLoading ? 'Designing...' : 'Design Experiment for Selected Path'}
      </SmallButton>

      {error && <p style={{color: '#f87171', fontSize: '13px'}}>{error}</p>}

      {experiment && (
        <ResultsContainer>
          <details>
            <summary style={{cursor: 'pointer', fontWeight: 600}}>Show Suggested Experiment Blueprint</summary>
            <JsonViewer>
              <code>{JSON.stringify(experiment.parsed_json, null, 2)}</code>
            </JsonViewer>
          </details>
          <div className="rule"></div>
          <details>
            <summary style={{cursor: 'pointer', fontWeight: 600}}>Show Raw LLM Response</summary>
             <JsonViewer>
              <code>{experiment.llm_response}</code>
            </JsonViewer>
          </details>
        </ResultsContainer>
      )}
    </DesignerContainer>
  );
};

export default ExperimentDesigner;
