import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// --- Component Imports ---
import SidePanel from './components/SidePanel';
import ChatPage from './pages/ChatPage';
import ChatWindow from './components/ChatWindow';
import GraphPage from './pages/GraphPage';
import GraphChatModal from './components/GraphChatModal';

// --- Utility and Type Imports ---
import { motion, AnimatePresence } from 'framer-motion';
import type { Source, GraphDataPayload, Message, ViewMode } from './models'; // Assuming all types are in models.ts

// --- API Configuration ---
const API_URL = "http://localhost:8001";

// --- THE MAIN APP COMPONENT ---
function App() {
  // --- State Management ---
  const [viewMode, setViewMode] = useState<ViewMode>('chat-landing');
  const [messages, setMessages] = useState<Message[]>([]);
  const [graphPayload, setGraphPayload] = useState<GraphDataPayload | null>(null);
  const [isGraphChatOpen, setIsGraphChatOpen] = useState(false);

  // --- Core Functions ---

  const handleSendMessage = async (query: string) => {
    if (!query.trim()) return;
    const userMessage: Message = { role: "user", content: query };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, { query });
      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.answer,
        sources: response.data.sources,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "An error occurred fetching the response.";
      const errorMessage: Message = { role: 'error', content: `⚠️ ${errorMsg}` };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const startConversation = (initialQuery: string) => {
    setViewMode('chat-active');
    setMessages([]);
    setTimeout(() => handleSendMessage(initialQuery), 50);
  };
  
  const handleSetViewMode = (mode: 'chat' | 'graph' | 'graph-chat') => {
    if (mode === 'chat') {
      setViewMode('chat-active');
    } else if (mode === 'graph-chat') {
      setIsGraphChatOpen(true);
    } else {
      setViewMode(mode as ViewMode); // Cast to ViewMode type
    }
  };

  const handleBackToChat = () => {
    setGraphPayload(null);
    setViewMode('chat-active');
  };

  // --- JSX Rendering ---
  return (
    <div className="app-container">
      {/* *** FIX: SidePanel is now rendered PERMANENTLY and UNCONDITIONALLY *** */}
      {/* It is no longer inside AnimatePresence or a conditional block. */}
      <div className="left-panel-container">
        <SidePanel
          setViewMode={handleSetViewMode}
          setGraphPayload={setGraphPayload}
        />
      </div>

      {/* The Main Content area still dynamically switches between components */}
      <div className="right-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode} // This key ensures the animation runs when the view changes
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="right-panel-content"
          >
            {viewMode === 'chat-landing' && <ChatPage onStartConversation={startConversation} />}
            {viewMode === 'chat-active' && <ChatWindow messages={messages} onSendMessage={handleSendMessage} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Overlays (GraphPage and GraphChatModal) remain the same */}
      <AnimatePresence>
        {viewMode === 'graph' && graphPayload && (
          <GraphPage 
            setViewMode={handleBackToChat} 
            htmlContent={graphPayload.html_content}
            downloadUrl={graphPayload.download_url}
          />
        )}
      </AnimatePresence>

      <GraphChatModal 
        isOpen={isGraphChatOpen} 
        onClose={() => setIsGraphChatOpen(false)} 
      />
    </div>
  );
}

export default App;