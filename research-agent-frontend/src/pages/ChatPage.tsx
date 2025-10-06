import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Menu,
  Plus,
  RefreshCw,
  Loader2,
  SendHorizontal,
} from "lucide-react";

// ---- Backend Endpoint ----
const API_URL = "http://localhost:8002/api/chat";

// ---- Suggestion Data ----
const suggestionCategories = [
  {
    title: "Document Analysis",
    prompts: [
      "Summarize the key findings from the latest batch report.",
      "What were the main anomalies in the last 24 hours?",
      "Compare material X vs. Y.",
    ],
  },
  {
    title: "Technical Analysis & Screening",
    prompts: [
      "Find all documents related to 'particle contamination'.",
      "Show the trend for 'resistivity' in Plant 5.",
      "Which batches had the highest metal PPM?",
    ],
  },
  {
    title: "Knowledge & Insights",
    prompts: [
      "What is the standard procedure for tool maintenance?",
      "Generate a knowledge graph from a document.",
      "Who is the supplier for component Z?",
    ],
  },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

// ---- Motion Variants ----
const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, delay } },
});

const listContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const listItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ---- Helper to normalize backend response ----
function parseAgentResponse(json: any): { answer: string; sources: string[] } {
  return {
    answer: json?.answer || "No answer could be generated.",
    sources: json?.sources || [],
  };
}

// ---- ChatPage Component ----
const ChatPage: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // Autofocus input once
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSuggestionClick = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const handleClearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = { role: "user", content: inputValue.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg.content }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(
          `Server error: ${resp.status} ${text || resp.statusText}`
        );
      }

      const data = await resp.json().catch(() => ({}));
      const { answer, sources } = parseAgentResponse(data);

      const assistantMsg: Message = { role: "assistant", content: answer, sources };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const msg =
        err?.name === "AbortError"
          ? "⚠️ Request aborted."
          : (err?.message as string) || "⚠️ Error contacting the server.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <div style={styles.page}>
      <style>{keyframes}</style>

      <motion.div
        style={styles.panel}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <button style={styles.sideBtn} title="Menu">
            <Menu size={18} />
          </button>
          <button style={styles.sideBtn} title="New Chat">
            <Plus size={18} />
          </button>
          <button
            style={{ ...styles.sideBtn, color: "#22d3ee" }}
            onClick={handleClearChat}
            title="Clear Chat"
          >
            <RefreshCw size={18} />
          </button>
        </aside>

        {/* Main Section */}
        <main style={styles.main}>
          <header style={styles.header}>
            <BrainCircuit size={22} color="#a5b4fc" />
            <h1 style={styles.brand}>Quality Agent</h1>
          </header>

          {messages.length === 0 ? (
            <>
              <motion.div {...fadeIn(0.05)} style={styles.welcome}>
                <h2 style={styles.welcomeTitle}>Hello, User</h2>
                <p style={styles.welcomeSub}>
                  I’m your Quality Intelligence assistant — ask me anything or use a suggestion.
                </p>
              </motion.div>

              <motion.div
                variants={listContainer}
                initial="hidden"
                animate="visible"
                style={styles.suggestGrid}
              >
                {suggestionCategories.map((category) => (
                  <motion.div
                    key={category.title}
                    variants={listItem}
                    style={styles.card}
                  >
                    <div style={styles.cardSheen} />
                    <h3 style={styles.cardTitle}>{category.title}</h3>
                    <div style={styles.promptCol}>
                      {category.prompts.map((prompt) => (
                        <motion.button
                          key={prompt}
                          style={styles.promptBtn}
                          onClick={() => handleSuggestionClick(prompt)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {prompt}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </>
          ) : (
            <section style={styles.chat}>
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={`${msg.role}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    style={{
                      ...styles.bubble,
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                      background:
                        msg.role === "user"
                          ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                          : "rgba(30,41,59,0.7)",
                      border:
                        msg.role === "user"
                          ? "1px solid rgba(99,102,241,0.4)"
                          : "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {msg.content}
                    {!!msg.sources?.length && (
                      <div style={styles.sources}>
                        {msg.sources.map((s, i) => (
                          <span key={i} style={styles.sourceTag}>{s}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    style={{ ...styles.bubble, alignSelf: "flex-start" }}
                  >
                    <Loader2 size={14} className="animate-spin" /> Thinking...
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </section>
          )}

          <motion.footer {...fadeIn(0.08)} style={styles.footer}>
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              style={styles.formRow}
              aria-label="Chat input form"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask your question..."
                style={styles.input}
                disabled={loading}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                style={styles.send}
                disabled={loading}
                aria-label="Send"
                title="Send"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
              </motion.button>
            </form>
            <div style={styles.hintRow}>
              <span style={styles.hintText}>Enter to send • Shift+Enter for new line</span>
            </div>
          </motion.footer>
        </main>
      </motion.div>
    </div>
  );
};

// ---- Sheen Animation ----
const keyframes = `
  .sheen::before {
    content: "";
    position: absolute;
    inset: -20%;
    transform: translateX(-140%) rotate(20deg);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
    transition: transform 0.6s ease;
  }
  .sheen:hover::before {
    transform: translateX(140%) rotate(20deg);
  }
`;

// ---- Styles ----
const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#030712", padding: "1.5rem" },
  panel: { display: "flex", width: "100%", maxWidth: "1100px", height: "85vh", background: "rgba(15,23,42,0.95)", borderRadius: "1.25rem", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" },
  sidebar: { width: "60px", background: "rgba(0,0,0,0.25)", borderRight: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem 0.5rem", gap: "1rem" },
  sideBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, color: "#cbd5e1", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" },
  main: { flex: 1, padding: "1.2rem 2rem", display: "flex", flexDirection: "column" },
  header: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", marginBottom: "0.5rem" },
  brand: { color: "#e2e8f0", fontSize: "1.1rem", fontWeight: 600 },
  welcome: { textAlign: "center", marginTop: "2rem" },
  welcomeTitle: { fontSize: "2rem", fontWeight: 700, background: "linear-gradient(to right, #818cf8, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  welcomeSub: { fontSize: "0.95rem", color: "#94a3b8", marginTop: "0.5rem" },
  suggestGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginTop: "1.5rem" },
  card: { position: "relative", background: "rgba(30,41,59,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "1rem", padding: "1rem" },
  cardSheen: { position: "absolute", inset: 0, background: "radial-gradient(800px 200px at -20% -20%, rgba(255,255,255,0.04), transparent)", pointerEvents: "none" },
  cardTitle: { color: "#cbd5e1", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.7rem" },
  promptCol: { display: "flex", flexDirection: "column", gap: "0.6rem" },
  promptBtn: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.6rem", padding: "0.65rem 0.8rem", color: "#cbd5e1", fontSize: "0.85rem", textAlign: "left", cursor: "pointer" },
  chat: { flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", gap: "0.8rem", marginTop: "1rem" },
  bubble: { maxWidth: "75%", padding: "0.8rem 1rem", borderRadius: "0.8rem", color: "#f8fafc", fontSize: "0.9rem" },
  sources: { marginTop: "0.4rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  sourceTag: { background: "rgba(79,70,229,0.25)", color: "#a5b4fc", padding: "0.25rem 0.5rem", borderRadius: "0.4rem", fontSize: "0.7rem" },
  footer: { marginTop: "auto", paddingTop: "0.9rem" },
  formRow: { display: "flex", alignItems: "center", gap: "0.6rem" },
  input: { flex: 1, padding: "0.85rem 1rem", borderRadius: "0.8rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,23,42,1)", color: "#f1f5f9", fontSize: "0.95rem" },
  send: { width: 44, height: 44, borderRadius: "50%", border: "none", background: "linear-gradient(135deg, #4f46e5, #6366f1)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 0 10px rgba(99,102,241,0.4)" },
  hintRow: { display: "flex", justifyContent: "flex-end", marginTop: "0.4rem" },
  hintText: { color: "#64748b", fontSize: "0.75rem" },
};

export default ChatPage;
