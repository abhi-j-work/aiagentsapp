// src/App.tsx

import { useState } from 'react';
import './App.css';
import ChatPage from './pages/ChatPage';
import GraphPage from './pages/GraphPage';
import UploadForm from './components/UploadForm';
import { motion, AnimatePresence } from 'framer-motion';
import type { Source, GraphDataPayload } from './models';

// Shared types
export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export type ViewMode = 'chat' | 'graph';


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
        <div className="left-panel">
          <header className="brand-header">
            <h1 className="brand-title">Entegris AI</h1>
            <p className="brand-subtitle">Research Assistant</p>
          </header>
          <UploadForm
            setViewMode={setViewMode}
            setGraphPayload={setGraphPayload}
          />
        </div>
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