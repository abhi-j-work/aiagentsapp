import React from 'react';
import { ParsedExperiment } from '../types';

interface ExperimentBlueprintProps {
  data: ParsedExperiment;
}

const ExperimentBlueprint: React.FC<ExperimentBlueprintProps> = ({ data }) => {
  if (!data) return <p>No experiment data to display.</p>;

  return (
    <div className="experiment-blueprint">
      <h3>{data.title || 'Experiment Details'}</h3>

      <div className="blueprint-section">
        <strong>Hypothesis:</strong>
        <p>{data.hypothesis}</p>
      </div>

      <div className="blueprint-section">
        <strong>Summary:</strong>
        <p>{data.experiment.summary}</p>
      </div>

      <div className="blueprint-section">
        <strong>Materials:</strong>
        <ul>
          {data.experiment.materials.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="blueprint-section">
        <strong>Steps:</strong>
        <ol>
          {data.experiment.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="blueprint-section">
        <strong>Measurements:</strong>
        <ul>
          {data.experiment.measurements.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="blueprint-section">
        <strong>Success Criteria:</strong>
        <p>{data.experiment.success_criteria}</p>
      </div>

      <div className="blueprint-section">
        <strong>Expected Outcome:</strong>
        <p>{data.expected_outcome}</p>
      </div>

      <div className="blueprint-section">
        <strong>Cost & Time Estimate:</strong>
        <p>{data.cost_estimate} / {data.time_estimate}</p>
      </div>

      {data.experiment.safety_notes && (
          <div className="blueprint-section safety-notes">
              <strong>Safety Notes:</strong>
              <p>{data.experiment.safety_notes}</p>
          </div>
      )}
    </div>
  );
};

export default ExperimentBlueprint;
