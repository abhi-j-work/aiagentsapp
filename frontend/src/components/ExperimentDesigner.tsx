import React, { useState, useEffect } from 'react';
import { designExperimentForPath } from '../services/api';
import { ExperimentData } from '../types';

interface ExperimentDesignerProps {
  selectedPath: string[] | null;
  contextText: string;
}

const ExperimentDesigner: React.FC<ExperimentDesignerProps> = ({ selectedPath, contextText }) => {
  const [experiment, setExperiment] = useState<ExperimentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Clear old experiment when a new path is selected
    setExperiment(null);
  }, [selectedPath]);

  const handleDesign = async () => {
    if (!selectedPath) return;
    setIsLoading(true);
    try {
      const result = await designExperimentForPath(selectedPath, contextText);
      setExperiment(result);
    } catch (error) {
      console.error("Failed to design experiment:", error);
      setExperiment({ error: String(error), prompt: '', llm_response: null, parsed_json: null });
    }
    setIsLoading(false);
  };

  if (!selectedPath) {
    return null; // Don't render if no path is selected
  }

  return (
    <div className="glass experiment-panel">
      <div className="section-title">Experiment Designer</div>
      <p><b>Selected Path:</b> {selectedPath.join(' → ')}</p>
      <button onClick={handleDesign} disabled={isLoading}>
        {isLoading ? 'Designing...' : 'Design Experiment for Path'}
      </button>

      {experiment && (
        <div className="experiment-results">
          {experiment.parsed_json && (
            <div className="result-section">
              <h4>{experiment.parsed_json.title || 'Experiment Blueprint'}</h4>
              <p><b>Hypothesis:</b> {experiment.parsed_json.hypothesis}</p>
              <pre>{JSON.stringify(experiment.parsed_json.experiment, null, 2)}</pre>
            </div>
          )}
          {experiment.error && <p className="error">Error: {experiment.error}</p>}
        </div>
      )}
    </div>
  );
};

export default ExperimentDesigner;  