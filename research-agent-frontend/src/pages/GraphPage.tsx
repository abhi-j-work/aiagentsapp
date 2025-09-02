// src/pages/GraphPage.tsx

import React from 'react';
import { X, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface GraphPageProps {
  setViewMode: () => void;
  htmlContent: string;
  downloadUrl: string;
}

const GraphPage: React.FC<GraphPageProps> = ({ setViewMode, htmlContent, downloadUrl }) => {
  const iframeSrc = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

  const overlayVariants = {
    hidden: { opacity: 0, scale: 0.97 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
  };

  const transition = {
    duration: 0.3,
    ease: 'easeInOut',
  } as const;

  return (
    <motion.div
      style={styles.graphOverlay}
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={transition}
    >
      <div style={styles.graphActionsContainer}>
        <motion.a
          href={downloadUrl}
          download="knowledge_graph.html"
          title="Download Graph HTML"
          style={styles.actionButton}
          whileHover={{
            scale: 1.15,
            boxShadow: '0 0 25px rgba(244, 114, 182, 0.7)',
            backgroundColor: 'rgba(244, 114, 182, 0.15)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Adjusted icon size slightly for the new button size */}
          <Download size={22} color="#f472b6" />
        </motion.a>
        
        <motion.button
          title="Close Graph View"
          style={styles.actionButton}
          onClick={setViewMode}
          whileHover={{
            scale: 1.15,
            rotate: 90,
            boxShadow: '0 0 30px rgba(34, 211, 238, 0.8)',
            backgroundColor: 'rgba(34, 211, 238, 0.2)',
          }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Increased icon size to fit the larger button */}
          <X size={30} color="#22d3ee" />
        </motion.button>
      </div>

      <iframe
        src={iframeSrc}
        title="Knowledge Graph"
        style={styles.iframe}
        sandbox="allow-scripts"
      />
    </motion.div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  graphOverlay: {
    position: 'fixed',
    top: '5vh',
    left: '5vw',
    height: '90vh',
    width: '90vw',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(12px) saturate(150%)',
    borderRadius: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  graphActionsContainer: {
    position: 'absolute',
    top: '1.5rem',
    right: '1.5rem',
    display: 'flex',
    gap: '1rem', // Increased gap slightly for more breathing room
    zIndex: 100,
  },
  actionButton: {
    // === BUTTON SIZE INCREASED HERE ===
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
    transition: 'background-color 0.2s, box-shadow 0.2s',
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: '100%',
    border: 'none',
    borderRadius: '1.5rem',
    zIndex: 1,
  },
};

export default GraphPage;