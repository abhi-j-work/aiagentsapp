import React, { useState } from "react";
import { motion } from 'framer-motion';
import { BrainCircuit, ArrowRight, Menu, Plus, RefreshCw } from 'lucide-react';

// --- Component Props ---
interface ChatPageProps {
  // Props to connect to your App's state management
}

// --- Static Data for Suggestions ---
const suggestionCategories = [
  {
    title: "Document Analysis",
    prompts: ["Summarize the key findings from the latest batch report.", "What were the main anomalies in the last 24 hours?", "Compare material X vs. Y."],
  },
  {
    title: "Technical Analysis & Screening",
    prompts: ["Find all documents related to 'particle contamination'.", "Show the trend for 'resistivity' in Plant 5.", "Which batches had the highest metal PPM?"],
  },
  {
    title: "Knowledge & Insights",
    prompts: ["What is the standard procedure for tool maintenance?", "Generate a knowledge graph from a document.", "Who is the supplier for component Z?"],
  },
];

// --- Main Component ---
const ChatPage: React.FC<ChatPageProps> = () => {
  const [inputValue, setInputValue] = useState("");

  const handleSuggestionClick = (prompt: string) => setInputValue(prompt);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    console.log("Sending message:", inputValue);
    setInputValue("");
  };

  return (
    <div style={styles.pageContainer}>
      <motion.div
        style={styles.mainPanel}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          boxShadow: [
            "0 0 60px rgba(59, 130, 246, 0.15), inset 0 0 8px rgba(59, 130, 246, 0.15)",
            "0 0 80px rgba(59, 130, 246, 0.25), inset 0 0 12px rgba(59, 130, 246, 0.25)",
            "0 0 60px rgba(59, 130, 246, 0.15), inset 0 0 8px rgba(59, 130, 246, 0.15)",
          ]
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          boxShadow: { duration: 3, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
        }}
      >
        <aside style={styles.sidebar}>
          <Menu size={20} style={styles.sidebarIcon} />
          <Plus size={20} style={styles.sidebarIcon} />
          <RefreshCw size={20} style={styles.sidebarIcon} />
        </aside>

        <main style={styles.mainContent}>
          <header style={styles.header}>
            <BrainCircuit size={24} color="#c7d2fe" />
            <h1 style={styles.brandName}>Agent</h1>
          </header>

          <div style={styles.welcomeSection}>
            <motion.h2 {...fadeUp(0.2)} style={styles.welcomeTitle}>Hello, User</motion.h2>
            <motion.p {...fadeUp(0.3)} style={styles.welcomeSubtitle}>I am your personal Quality Intelligence assistant.</motion.p>
          </div>

          <motion.div style={styles.suggestionsGrid} variants={staggerContainer(0.4)} initial="hidden" animate="visible">
            {suggestionCategories.map((category) => (
              <motion.div key={category.title} style={styles.suggestionCard} variants={fadeUpVariant}>
                <h3 style={styles.cardTitle}>{category.title}</h3>
                <div style={styles.promptsContainer}>
                  {category.prompts.map((prompt) => (
                    <motion.button
                      key={prompt}
                      style={styles.promptButton}
                      onClick={() => handleSuggestionClick(prompt)}
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    >
                      {prompt}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.footer {...fadeUp(0.8)} style={styles.chatFooter}>
            <form onSubmit={handleSubmit} style={styles.chatForm}>
              <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Ask me anything, or start with a suggestion above..." style={styles.chatInput} />
              <motion.button type="submit" style={styles.submitButton}
                animate={{ scale: inputValue ? 1.1 : 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowRight size={20} />
              </motion.button>
            </form>
          </motion.footer>
        </main>
      </motion.div>
    </div>
  );
};

// --- Animation Helpers ---
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay }
});
const staggerContainer = (delayChildren = 0) => ({
  animate: { transition: { staggerChildren: 0.1, delayChildren } }
});
const fadeUpVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// --- Styles ---
const styles: { [key: string]: React.CSSProperties } = {
  pageContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#030712', padding: '2rem' },
  mainPanel: { width: '100%', maxWidth: '1100px', height: '85vh', maxHeight: '750px', backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(16px)', borderRadius: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', overflow: 'hidden' },
  sidebar: { padding: '1.5rem 1rem', borderRight: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', background: 'rgba(0,0,0,0.2)' },
  sidebarIcon: { color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s' },
  mainContent: { flex: 1, padding: '1.5rem 2.5rem', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', opacity: '0.8' },
  brandName: { fontSize: '1.25rem', fontWeight: '500', color: '#e2e8f0' },
  welcomeSection: { textAlign: 'center', flex: 0.8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }, // Adjusted flex value here
  welcomeTitle: { fontSize: '3.5rem', fontWeight: 'bold', background: 'linear-gradient(to right, #818cf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.05em' },
  welcomeSubtitle: { fontSize: '1.125rem', color: '#94a3b8', marginTop: '0.5rem' },
  suggestionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginTop: '1rem' }, // Adjusted margin
  suggestionCard: { background: 'rgba(30, 41, 59, 0.6)', borderRadius: '1rem', padding: '1.25rem', border: '1px solid rgba(255, 255, 255, 0.05)' },
  cardTitle: { fontSize: '0.9rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '1rem' },
  promptsContainer: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  promptButton: { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.5rem', padding: '0.75rem', color: '#cbd5e1', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', transition: 'background-color 0.2s, border-color 0.2s' },
  chatFooter: { marginTop: 'auto', paddingTop: '1.5rem' },
  chatForm: { position: 'relative' },
  chatInput: { width: '100%', padding: '0.85rem 3.5rem 0.85rem 1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(15, 23, 42, 1)', color: '#f1f5f9', fontSize: '1rem', outline: 'none' },
  submitButton: { position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '0.5rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
};

export default ChatPage;