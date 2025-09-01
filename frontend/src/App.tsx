import { useState } from 'react';
import { GraphData, InsightData, SimpleNode, SimpleRelationship } from './services/api';
import InputPanel from './components/InputPanel';
import GraphDisplay from './components/GraphDisplay';
import InsightPanel from './components/InsightPanel';
import SettingsPanel from './components/SettingsPanel';

type Tab = 'workspace' | 'settings' | 'about';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('workspace');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');

  // State for highlighting nodes/paths in the graph
  const [highlightedPath, setHighlightedPath] = useState<{ nodes: string[], pairs: string[][] } | null>(null);

  const resetState = () => {
    setGraphData(null);
    setInsightData(null);
    setError(null);
    setRawText('');
    setHighlightedPath(null);
  }

  const handleGraphGenerated = (data: GraphData, text: string) => {
    setGraphData(data);
    setRawText(text);
    setError(null);
  };

  const Header = () => (
    <header>
      <div className="agent-title">Entegris Research Agent</div>
      <div className="agent-sub">A React-based interface for extracting knowledge graphs from scientific documents.</div>
      <div className="rule"></div>
    </header>
  );

  const Tabs = () => (
    <div className="tabs">
      <div className={`tab ${activeTab === 'workspace' ? 'active' : ''}`} onClick={() => setActiveTab('workspace')}>
        🧪 Workspace
      </div>
      <div className={`tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
        ⚙️ Settings
      </div>
      <div className={`tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
        📎 About
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <Tabs />

      {activeTab === 'workspace' && (
        <div className="main-layout">
          <div className="left-panel">
            <InputPanel
              onGenerationStart={() => {
                setIsLoading(true);
                resetState();
              }}
              onGenerationSuccess={handleGraphGenerated}
              onGenerationError={(err) => {
                setError(err);
                resetState();
              }}
              onGenerationEnd={() => setIsLoading(false)}
              graphData={graphData}
              rawText={rawText}
              setInsightData={setInsightData}
              setHighlightedPath={setHighlightedPath}
            />
            {insightData && graphData && (
              <InsightPanel
                insightData={insightData}
                graphData={graphData}
                rawText={rawText}
                setHighlightedPath={setHighlightedPath}
              />
            )}
          </div>
          <div className="right-panel">
            <GraphDisplay
              graphData={graphData}
              highlightedPath={highlightedPath}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>
      )}

      {activeTab === 'settings' && <SettingsPanel />}

      {activeTab === 'about' && (
        <div className="glass">
          <div className="section-title">What is Entegris Research Agent?</div>
          <p>
            This application converts scientific text into a navigable knowledge graph using an LLM-only pipeline.
            Upload a PDF or TXT, or paste text directly. The agent extracts entities and relationships, then renders
            an interactive graph.
          </p>
          <p>This version was converted from a Streamlit application to a React/Python web application.</p>
        </div>
      )}
    </>
  );
}

export default App;
