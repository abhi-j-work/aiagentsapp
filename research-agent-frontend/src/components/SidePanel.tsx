// src/components/SidePanel.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UploadCloud, ArrowRight, Loader2 } from 'lucide-react';

// You may need to adjust these import paths based on your project structure
import type { ViewMode } from '../App';
import type { GraphDataPayload } from '../models';

const API_URL = 'http://localhost:8000';

interface SidePanelProps {
  setViewMode: (mode: ViewMode) => void;
  setGraphPayload: (payload: GraphDataPayload | null) => void;
}

// Animation variants for the main container and its children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

const SidePanel: React.FC<SidePanelProps> = ({ setViewMode, setGraphPayload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleGenerateClick = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post(`${API_URL}/api/graph/from-file`, formData);
      setGraphPayload(response.data);
      setViewMode('graph');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred while processing the file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="left-panel"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="brand-header" variants={itemVariants}>
        <h1 className="brand-title">Entegris AI</h1>
        <p className="brand-subtitle">Research Assistant</p>
      </motion.div>

      <motion.div className="upload-section" variants={itemVariants}>
        <h2 className="upload-title">Generate from Document</h2>

        <label htmlFor="file-upload" className="file-input-label">
          <UploadCloud size={20} className="file-input-icon" />
          <span className="file-input-text">
            {selectedFile ? selectedFile.name : 'Select a document'}
          </span>
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileChange}
          className="file-input"
          disabled={isLoading}
        />

        {selectedFile && (
          <motion.button
            onClick={handleGenerateClick}
            className="generate-button"
            disabled={isLoading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>Generate Knowledge Graph</span>
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        )}
        
        {error && (
            <motion.p 
              className="error-message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SidePanel;