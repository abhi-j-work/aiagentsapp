// src/App.tsx

import { useState } from 'react';
import './App.css';
import ChatPage from './pages/ChatPage';
import GraphPage from './pages/GraphPage';
import SidePanel from './components/SidePanel'; // <-- 1. IMPORT the new SidePanel
import { motion, AnimatePresence } from 'framer-motion';
import type { Source, GraphDataPayload } from './models';

// Shared types (remain the same)
export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export type ViewMode = 'chat' | 'graph';

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
        {viewMode === 'graph' && graphPayload && (
          <GraphPage 
            setViewMode={handleBackToChat} 
            htmlContent={graphPayload.html_content}
            downloadUrl={graphPayload.download_url}
          />
        )}
      </AnimatePresence>

      <div className="app-grid">
        {/* --- THIS IS THE CORRECTED SECTION --- */}
        <div className="left-panel">
          {/* 
            The old <header> and <UploadForm> are removed.
            They are replaced by the single, self-contained SidePanel component.
            We pass the necessary state setters down as props.
          */}
          <SidePanel
            setViewMode={setViewMode}
            setGraphPayload={setGraphPayload}
          />
        </div>
        {/* --- END OF CORRECTION --- */}

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