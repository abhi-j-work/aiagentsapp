import React from 'react';
import styled from 'styled-components';
import { useGraph } from '../contexts/GraphContext';
import GraphView from './GraphView';
import ExperimentDesigner from './ExperimentDesigner';

const OutputContainer = styled.div`
  height: 100%;
`;

const Placeholder = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
  color: #8a9bb3;
  font-size: 1.1rem;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  /* Basic spinner for loading state */
  border: 4px solid rgba(255,255,255,0.1);
  border-left-color: #60a5fa;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const GraphOutput: React.FC = () => {
  const { graphData, insight, isLoading } = useGraph();

  if (isLoading) {
    return (
      <div className="glass">
        <Placeholder>
          <LoadingSpinner />
        </Placeholder>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="glass">
        <Placeholder>
          <p>Load a document and click <strong>Generate Knowledge Graph</strong> to begin.</p>
        </Placeholder>
      </div>
    );
  }

  const getHighlightPath = () => {
    if (!insight || !insight.found || !insight.paths) {
      return undefined;
    }
    const uniqueNodes = new Set<string>();
    const pairs: (string|number)[][] = [];

    insight.paths.forEach(pathStr => {
      const nodesInPath = pathStr.split(/\s*→\s*|\s*->\s*|\s*-\s*/).map(n => n.trim()).filter(Boolean);
      nodesInPath.forEach(node => uniqueNodes.add(node));
      for (let i = 0; i < nodesInPath.length - 1; i++) {
        pairs.push([nodesInPath[i], nodesInPath[i+1]]);
      }
    });

    return { nodes: Array.from(uniqueNodes), pairs };
  };

  return (
    <OutputContainer>
      <div className="glass">
        <h3 className="section-title">Graph Output</h3>
        <GraphView graphData={graphData} highlightPath={getHighlightPath()} />
      </div>

      {insight && insight.found && (
        <div className="glass" style={{marginTop: '1.5rem'}}>
          <h3 className="section-title">Discovered Insight</h3>
          <p>{insight.explanation}</p>
          <b>Discovered path(s):</b>
          {insight.paths?.map((p, i) => (
            <pre key={i} style={{background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px'}}><code>{p}</code></pre>
          ))}
          <ExperimentDesigner insight={insight} />
        </div>
      )}
    </OutputContainer>
  );
};

export default GraphOutput;
