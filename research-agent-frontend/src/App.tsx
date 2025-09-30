// src/App.tsx

import { useState } from 'react';
import './App.css';
import ChatPage from './pages/ChatPage';
import GraphPage from './pages/GraphPage';
import SidePanel from './components/SidePanel';
import { GraphQueryPage } from './pages/GraphQueryPage'; // <-- NEW import
import { motion, AnimatePresence } from 'framer-motion';
import type { Source, GraphDataPayload } from './models';

// Shared types (remain the same)
export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export type ViewMode = 'chat' | 'graph' | 'graphQuery'; // <-- added new viewMode

// This is a placeholder for your model's GraphData type definition
export interface GraphData {
  nodes: { id: string; type: string }[];
  relationships: { source: string; target: string; type: string }[];
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [graphPayload, setGraphPayload] = useState<GraphDataPayload | null>(null);

  const handleBackToChat = () => {
    setGraphPayload(null);
    setViewMode('chat');
  };

  return (
    <motion.div 
      className="app-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence>
        {/* Existing GraphPage */}
        {viewMode === 'graph' && graphPayload && (
          <GraphPage 
            setViewMode={handleBackToChat} 
            htmlContent={graphPayload.html_content}
            downloadUrl={graphPayload.download_url}
          />
        )}

        {/* NEW: GraphQueryPage */}
        {viewMode === 'graphQuery' && (
          <GraphQueryPage />
        )}
      </AnimatePresence>

      <div className="app-grid">
        {/* Left Panel */}
        <div className="left-panel">
          <SidePanel
            setViewMode={setViewMode}      // allows switching to graphQuery or graph
            setGraphPayload={setGraphPayload} // sets payload for GraphPage
          />
        </div>

        {/* Right Panel */}
        <div className="right-panel">
          <ChatPage
            setGraphPayload={setGraphPayload}
            setViewMode={setViewMode}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default App;

