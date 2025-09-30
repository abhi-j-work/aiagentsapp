// src/components/SidePanel.tsx

import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { UploadCloud, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// Types
import type { ViewMode } from "../App";
import type { GraphDataPayload } from "../models";

const API_URL = "http://localhost:8000";

interface SidePanelProps {
  setViewMode: (mode: ViewMode) => void;
  setGraphPayload: (payload: GraphDataPayload | null) => void;
}

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
} as const;

const SidePanel: React.FC<SidePanelProps> = ({ setViewMode, setGraphPayload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("llama3-8b-8192");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles[0]) {
        setSelectedFile(acceptedFiles[0]);
        setError(null);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    multiple: false,
  });

  const handleGenerateClick = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      toast.loading("Analyzing document, this may take a moment...");
      const response = await axios.post(`${API_URL}/api/graph/from-file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setGraphPayload(response.data);
      setViewMode("graph");
      toast.dismiss();
      toast.success("Knowledge graph generated successfully!");
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "An unexpected error occurred.";
      toast.dismiss();
      toast.error(errorMessage);
      setError(errorMessage);
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
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      {/* Brand Header */}
      <motion.div className="brand-header" variants={itemVariants}>
        <h1 className="brand-title">Entegris AI</h1>
        <p className="brand-subtitle">Quality Intelligence</p>
      </motion.div>

      {/* Upload Section */}
      <motion.h2 className="upload-title" variants={itemVariants}>
        Ingest Graph Data
      </motion.h2>

      <motion.div
        variants={itemVariants}
        {...getRootProps({
          className: `file-input-label ${isDragActive ? "active" : ""}`,
        })}
      >
        <input {...getInputProps()} disabled={isLoading} />
        <UploadCloud size={24} />
        <span className="file-input-text">
          {selectedFile ? selectedFile.name : (isDragActive ? "Drop the files here" : "Drag & drop or click")}
        </span>
      </motion.div>

      {/* Model Selection */}
      <motion.div variants={itemVariants}>
        <label htmlFor="model-select" className="model-label">Model</label>
        <select
          id="model-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="model-select"
        >
          <option value="llama3-8b-8192">LLaMA 3 - 8B (Fast)</option>
          <option value="llama3-70b-8192">LLaMA 3 - 70B (High Quality)</option>
        </select>
      </motion.div>

      {/* Generate Button */}
      {selectedFile && (
        <motion.button
          onClick={handleGenerateClick}
          className="generate-button"
          disabled={isLoading}
          variants={itemVariants}
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

      {/* Error Display */}
      {error && !isLoading && (
        <motion.div className="error-container" variants={itemVariants}>
          <p className="error-message">{error}</p>
          <button onClick={handleGenerateClick} className="retry-button">
            <RefreshCw size={14} /> Retry
          </button>
        </motion.div>
      )}

      {/* --- NEW BUTTON: Open Graph Query Page --- */}
      <motion.div variants={itemVariants} style={{ marginTop: "auto", paddingTop: "1rem" }}>
        <button
          onClick={() => setViewMode("graphQuery")} // new viewMode handled in App.tsx
          className="graph-query-button"
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            backgroundColor: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          Open Graph Query Page
        </button>
      </motion.div>
    </motion.div>
  );
};

export default SidePanel;
