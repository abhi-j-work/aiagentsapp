// src/components/ChatWindow.tsx

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import type { Message } from "../App";
import { Send, Loader2, Link as LinkIcon, BrainCircuit } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = "http://localhost:8000";

// 1. COMBINED INTERFACE: All props are now in a single, correct interface.
interface ChatWindowProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onGenerateGraph: () => void;
  isGeneratingGraph: boolean;
  isGraphReady: boolean; // The new prop is now officially part of the type definition.
}

// 2. DESTRUCTURE THE NEW PROP: We add `isGraphReady` to the function signature.
const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  setMessages, 
  onGenerateGraph, 
  isGeneratingGraph, 
  isGraphReady 
}) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    // ... (handleSend logic remains exactly the same)
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, { query: currentInput });
      const assistantMessage: Message = {
        role: "assistant",
        content: response.data.answer,
        sources: response.data.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = { role: "assistant", content: `⚠️ ${error.response?.data?.detail || "An error occurred."}` };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`message-wrapper ${msg.role}`}
            >
              <div className="message-content"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <motion.div 
                  className="sources-container"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ delay: 0.3 }}
                >
                  <h4 className="sources-title">Sources:</h4>
                  {msg.sources.map((source, idx) => (
                    <a href={source.link} target="_blank" rel="noopener noreferrer" key={idx} className="source-link">
                      <LinkIcon size={12} />
                      <span>{source.title}</span>
                    </a>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="message-wrapper assistant">
              <div className="message-content typing-indicator"><span></span><span></span><span></span></div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        {/* 3. UPDATE THE BUTTON'S LOGIC to use the new prop */}
        <button
          title="Generate Graph from Conversation"
          onClick={onGenerateGraph}
          disabled={isGeneratingGraph || !isGraphReady}
          // The pulsating glow is now conditionally applied based on the parent's logic.
          className={`generate-graph-button ${isGraphReady ? 'pulsating-glow' : ''}`}
        >
          {isGeneratingGraph ? <Loader2 className="animate-spin" /> : <BrainCircuit size={20} />}
        </button>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()} placeholder="Ask about Entegris..." disabled={isLoading} className="chat-input" />
        <button onClick={handleSend} disabled={isLoading || !input.trim()} className="send-button">
          {isLoading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;