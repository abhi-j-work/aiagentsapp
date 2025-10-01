// src/App.tsx
import React, { useState } from 'react';
// ... other imports
import GraphChatModal from './components/GraphChatModal'; // <-- NEW: Import the modal
import { AnimatePresence, motion } from 'framer-motion';
import ChatWindow from './components/ChatWindow';
import ChatPage from './pages/ChatPage';
// ... other imports

export type ViewMode = 'chat-landing' | 'chat-active' | 'graph'; // No longer need 'graph-query'

function App() {
  // ... (existing state for messages, graphPayload, etc.)
  const [isGraphChatOpen, setIsGraphChatOpen] = useState(false); // <-- NEW: State for the modal

  // ... (existing handlers like handleSendMessage, startConversation, etc.)

  // Updated handler to accept 'graph-chat' as a mode
  const handleSetViewMode = (mode: 'chat' | 'graph' | 'graph-chat') => {
    if (mode === 'chat') {
      setViewMode('chat-active');
    } else if (mode === 'graph-chat') {
      setIsGraphChatOpen(true); // <-- Open the modal
    } else {
      setViewMode(mode);
    }
  };

  return (
    <div className="app-container">
      {/* ... (SidePanel rendering logic remains the same) ... */}
      <div className="right-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            // ... animation props
            className="right-panel-content"
          >
            {viewMode === 'chat-landing' && <ChatPage onStartConversation={startConversation} />}
            {/* The ChatWindow is now for general chat */}
            {viewMode === 'chat-active' && <ChatWindow messages={messages} onSendMessage={handleSendMessage} />}
            {/* GraphQueryPage is now replaced by the modal */}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ... (GraphPage (overlay) rendering logic remains the same) ... */}

      {/* NEW: Render the GraphChatModal */}
      <GraphChatModal 
        isOpen={isGraphChatOpen} 
        onClose={() => setIsGraphChatOpen(false)} 
      />
    </div>
  );
}

export default App;