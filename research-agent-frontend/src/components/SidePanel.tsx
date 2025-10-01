import React, { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud,
  ArrowRight,
  Loader2,
  RefreshCw,
  FileText,
  X,
  BrainCircuit, // A more fitting icon for the interactive query
} from "lucide-react";
import { toast } from "sonner";

// --- Type Imports ---
// These types should be defined in App.tsx and imported here
import type { GraphDataPayload } from "../App";

// A more specific type for the setViewMode prop for clarity
type ViewModeSetter = (mode: 'graph' | 'graph-chat') => void;

const API_URL = "http://localhost:8002";

// --- Component Props ---
interface SidePanelProps {
  // This prop allows the SidePanel to tell App.tsx to change the view
  setViewMode: ViewModeSetter;
  // This prop allows the SidePanel to pass the generated graph data to App.tsx
  setGraphPayload: (payload: GraphDataPayload | null) => void;
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 120, damping: 15 },
  },
};

const fileMotionProps = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
};

const placeholderMotionProps = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};


// --- The Component ---
const SidePanel: React.FC<SidePanelProps> = ({ setViewMode, setGraphPayload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    disabled: isLoading,
  });

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the file dialog from opening
    setSelectedFile(null);
  };

  const handleGenerateClick = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", selectedFile);

    const toastId = toast.loading("Analyzing document, this may take a moment...");
    try {
      const response = await axios.post(`${API_URL}/api/graph/from-file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setGraphPayload(response.data);
      setViewMode("graph"); // Tell App.tsx to show the full-screen graph
      toast.success("Knowledge graph generated successfully!", { id: toastId });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "An unexpected error occurred.";
      toast.error(errorMessage, { id: toastId });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div style={styles.leftPanel} variants={containerVariants} initial="hidden" animate="visible">
      <div style={styles.panelContent}>
        {/* Brand Header */}
        <motion.div style={styles.brandHeader} variants={itemVariants}>
          <h1 style={styles.brandTitle}>Entegris AI</h1>
          <p style={styles.brandSubtitle}>Quality Intelligence</p>
        </motion.div>

        {/* Upload Section */}
        <motion.h2 style={styles.uploadTitle} variants={itemVariants}>
          Ingest Document
        </motion.h2>

        <motion.div
          variants={itemVariants}
          {...getRootProps()}
          style={styles.dropzone(isDragActive, !!selectedFile, !!error)}
        >
          <input {...getInputProps()} />
          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div key="selected" {...fileMotionProps} style={styles.filePreview}>
                <FileText size={24} color="#a78bfa" />
                <span style={styles.fileName}>{selectedFile.name}</span>
                <button onClick={handleRemoveFile} style={styles.removeFileButton}>
                  <X size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.div key="placeholder" {...placeholderMotionProps} style={styles.placeholder}>
                <UploadCloud size={24} color={isDragActive ? "#a78bfa" : "#94a3b8"} />
                <span style={styles.placeholderText}>
                  {isDragActive ? "Drop file here..." : "Drag & drop or click"}
                </span>
                <p style={styles.fileTypes}>Supports .pdf, .txt, .md</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Generate Button for File Upload */}
        <AnimatePresence>
          {selectedFile && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <motion.button
                onClick={handleGenerateClick}
                style={styles.generateButton}
                disabled={isLoading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                {isLoading ? (
                  <><Loader2 size={18} className="animate-spin" /><span>Analyzing...</span></>
                ) : (
                  <><ArrowRight size={16} /><span>Generate Knowledge Graph</span></>
                )}
              </motion.button>
            </motion.div> 
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && !isLoading && (
          <motion.div style={styles.errorContainer} variants={itemVariants}>
            <p style={styles.errorMessage}>{error}</p>
            <button onClick={handleGenerateClick} style={styles.retryButton}>
              <RefreshCw size={14} /> Retry
            </button>
          </motion.div>
        )}
      </div>

      {/* Footer / Secondary Actions */}
      <motion.div style={styles.footer} variants={itemVariants}>
        <button
          onClick={() => setViewMode("graph-chat")} // This tells App.tsx to open the GraphChatModal
          style={styles.chatButton}
        >
          <BrainCircuit size={16} />
          <span>Interactive Graph Query</span>
        </button>
      </motion.div>
    </motion.div>
  );
};

// --- Styles ---
const styles: { [key: string]: React.CSSProperties | ((...args: any[]) => React.CSSProperties) } = {
  leftPanel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#111827",
    padding: "2rem",
    borderRight: "1px solid #374151"
  },
  panelContent: {
    flex: 1
  },
  brandHeader: {
    marginBottom: "3rem"
  },
  brandTitle: {
    fontSize: "2.25rem",
    fontWeight: "bold",
    color: "#f9fafb"
  },
  brandSubtitle: {
    color: "#9ca3af",
    marginTop: "0.25rem"
  },
  uploadTitle: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: "1rem"
  },
  dropzone: (isDragActive: boolean, isFileSelected: boolean, hasError: boolean) => ({
    border: `2px dashed ${isDragActive ? "#a78bfa" : isFileSelected ? "#4ade80" : hasError ? "#f87171" : "#4b5563"}`,
    borderRadius: "0.75rem",
    padding: "2rem",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    backgroundColor: isDragActive ? "rgba(167, 139, 250, 0.1)" : isFileSelected ? "rgba(74, 222, 128, 0.05)" : "#1f2937",
    marginBottom: "1.5rem",
  }),
  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem'
  },
  placeholderText: {
    color: "#d1d5db",
    fontWeight: "500"
  },
  fileTypes: {
    fontSize: "0.8rem",
    color: "#6b7280"
  },
  filePreview: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    color: "#e5e7eb"
  },
  fileName: {
    flex: 1,
    textAlign: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  removeFileButton: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#9ca3af"
  },
  generateButton: {
    width: "100%",
    padding: "0.75rem 1.5rem",
    borderRadius: "0.5rem",
    background: "linear-gradient(to right, #8b5cf6, #6366f1)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.75rem",
    fontWeight: "600",
    fontSize: "1rem",
  },
  errorContainer: {
    marginTop: "1rem",
    padding: "0.75rem",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.5)",
    borderRadius: "0.5rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  errorMessage: {
    color: "#fca5a5"
  },
  retryButton: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "none",
    color: "#fca5a5",
    padding: "0.25rem 0.5rem",
    borderRadius: "0.25rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem"
  },
  footer: {
    paddingTop: "1.5rem",
    marginTop: "auto",
    borderTop: "1px solid #374151"
  },
  chatButton: {
    width: "100%",
    padding: "0.6rem 1rem",
    backgroundColor: "transparent",
    color: "#a5b4fc",
    border: "1px solid #4f46e5",
    borderRadius: "0.5rem",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.75rem",
    transition: "all 0.2s ease-in-out",
    fontWeight: 500,
  },
};

export default SidePanel;