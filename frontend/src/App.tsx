import { useState } from 'react';
import './styles/App.css';
import { generateGraphFromFile, generateGraphFromText } from './services/api';
import { GraphData, HighlightPath, InsightData } from './types';
import ControlPanel from './components/ControlPanel';
import GraphDisplay from './components/GraphDisplay';
import InsightPanel from './components/InsightPanel';
import ExperimentDesigner from './components/ExperimentDesigner';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  
  const [selectedPath, setSelectedPath] = useState<string[] | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<HighlightPath | null>(null);

  const handleGenerate = async (source: { text: string } | { file: File }) => {
    setIsLoading(true);
    setError(null);
    setGraphData(null);
    setInsightData(null);
    setSelectedPath(null);
    setHighlightedPath(null);

    try {
      let result;
      if ('text' in source) {
        setRawText(source.text);
        result = await generateGraphFromText(source.text);
      } else {
        result = await generateGraphFromFile(source.file);
        // We won't have the text client-side for PDFs, the backend handles it.
        setRawText("Text extracted from uploaded file on the backend.");
      }
      
      setGraphData(result.graph);
      setInsightData(result.insight);
      
      if (result.insight?.found && result.insight.raw_paths.length > 0) {
        handlePathSelect(result.insight.raw_paths[0]);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePathSelect = (path: string[]) => {
      setSelectedPath(path);
      const pairs: [string, string][] = [];
      for (let i = 0; i < path.length - 1; i++) {
          pairs.push([path[i], path[i+1]]);
      }
      setHighlightedPath({ nodes: path, pairs });
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1 className="agent-title">Entegris Research Agent</h1>
        <p className="agent-sub">Agentic Knowledge Graph Explorer</p>
      </header>
      
      <main className="main-grid">
        <div className="left-column">
          <ControlPanel onGenerate={handleGenerate} isLoading={isLoading} />
          {insightData && (
            <InsightPanel insight={insightData} onPathSelect={handlePathSelect} />
          )}
          {selectedPath && (
            <ExperimentDesigner selectedPath={selectedPath} contextText={rawText} />
          )}
        </div>
        
        <div className="right-column">
          <GraphDisplay
            graphData={graphData}
            highlightedPath={highlightedPath}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </main>
    </div>
  );
}

export default App;