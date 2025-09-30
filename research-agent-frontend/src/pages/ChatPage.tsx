// src/pages/ChatPage.tsx

import React, { useState, useEffect } from "react";
import axios from "axios";
import { AnimatePresence } from 'framer-motion';
import ChatWindow from "../components/ChatWindow";
import GeneratingGraphOverlay from "../components/GeneratingGraphOverlay";
import type { ViewMode, Message } from "../App";
import type { GraphDataPayload } from '../models';

const API_URL = "http://localhost:8000";

// The full welcome message that we will "type" out.
const WELCOME_MESSAGE = "Hello! I am an AI assistant for Entegris. Ask me anything, or upload a document to begin.";

interface ChatPageProps {
  setViewMode: (mode: ViewMode) => void;
  setGraphPayload: (payload: GraphDataPayload | null) => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ setViewMode, setGraphPayload }) => {
  // Start with an empty message content
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "" }]);
  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
  const [isGraphReady, setIsGraphReady] = useState(false);

  // --- NEW "TYPING" EFFECT ---
  useEffect(() => {
    let charIndex = 0;
    const interval = setInterval(() => {
      if (charIndex < WELCOME_MESSAGE.length) {
        // Append one character at a time to the first message's content
        setMessages(prev => [{ ...prev[0], content: WELCOME_MESSAGE.slice(0, charIndex + 1) }]);
        charIndex++;
      } else {
        clearInterval(interval);
      }
    }, 25); // Adjust typing speed here (milliseconds)

    return () => clearInterval(interval); // Cleanup on unmount
  }, []);
  // --- END OF EFFECT ---

  useEffect(() => {
    if (messages.length > 2) {
      setIsGraphReady(true);
    } else {
      setIsGraphReady(false);
    }
  }, [messages]);

  const handleGenerateGraph = async () => {
    // ... (rest of the component logic remains the same)
    if (!isGraphReady) {
      alert("Please have a bit more conversation to provide richer context for the graph.");
      return;
    }
    setIsGeneratingGraph(true);
    try {
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n---\n');
      const response = await axios.post(`${API_URL}/api/graph/from-conversation`, { text: conversationText });
      setTimeout(() => {
        setGraphPayload(response.data);
        setViewMode("graph");
        setIsGeneratingGraph(false);
      }, 1500);
    } catch (error: any) {
      alert(`⚠️ Could not generate graph. Error: ${error.response?.data?.detail || "Unknown error"}`);
      setIsGeneratingGraph(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isGeneratingGraph && <GeneratingGraphOverlay />}
      </AnimatePresence>
      <ChatWindow
        messages={messages}
        setMessages={setMessages}
        onGenerateGraph={handleGenerateGraph}
        isGeneratingGraph={isGeneratingGraph}
        isGraphReady={isGraphReady}
      />
    </>
  );
};

export default ChatPage;