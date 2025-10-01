import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, X, Bot, User } from "lucide-react";
import type { Message } from "../App"; // Assuming Message type is in App.tsx

const API_URL = "http://localhost:8001";

// --- Type Definitions for Graph Data ---
interface Node extends d3.SimulationNodeDatum {
  id: string;
  name?: string;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  type?: string;
}

interface GraphChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GraphChatModal: React.FC<GraphChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! Ask me a question in natural language, and I'll generate a knowledge graph from the answer. For example, 'Show me all vendors and the materials they supply.'",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- API Call to Text-to-Cypher Endpoint ---
  const handleSubmitQuery = async () => {
    if (!inputQuery.trim()) return;

    const userMessage: Message = { role: "user", content: inputQuery };
    setMessages(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    setInputQuery("");

    try {
      const res = await fetch(`${API_URL}/api/graph/text-to-cypher?useLLM=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMessage.content }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      
      const assistantMessage: Message = {
        role: "assistant",
        content: `I found ${data.results?.length || 0} results and generated a graph. Here is the Cypher query I used: \`\`\`cypher\n${data.cypher}\n\`\`\``
      };
      setMessages(prev => [...prev, assistantMessage]);

      // --- Process and Set Graph Data ---
      const extractedNodes: Node[] = [];
      const extractedEdges: Edge[] = [];
      const nodeIds = new Set<string>();

      if (data.results?.length) {
        data.results.forEach((item: any) => {
          Object.values(item).forEach((entity: any) => {
            if (entity && entity.id && !nodeIds.has(entity.id)) {
              nodeIds.add(entity.id);
              extractedNodes.push({ id: entity.id, name: entity.name || entity.id, ...entity });
            }
          });
        });
      }
      setGraphData({ nodes: extractedNodes, edges: extractedEdges });

    } catch (err: any) {
      console.error(err);
      const errorMessage: Message = { role: "error", content: err.message || "Failed to fetch graph." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- D3 Graph Rendering Effect ---
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) {
        d3.select(svgRef.current).selectAll("*").remove(); // Clear SVG if no nodes
        return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous graph

    const width = svg.node()?.getBoundingClientRect().width || 600;
    const height = svg.node()?.getBoundingClientRect().height || 400;

    const simulation = d3
      .forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.edges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const g = svg.append("g");

    const link = g
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(graphData.edges)
      .enter()
      .append("line");

    const node = g
      .append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .enter()
      .append("g")
      .call(d3.drag<any, Node>().on("start", dragstarted).on("drag", dragged).on("end", dragended));

    node.append("circle").attr("r", 15).attr("fill", "#6366f1");

    node.append("text")
        .text(d => d.name || d.id)
        .attr("x", 20)
        .attr("y", 5)
        .attr("fill", "#e5e7eb")
        .attr("font-size", 12);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Zoom functionality
    const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
        g.attr("transform", event.transform);
    });
    svg.call(zoom);

    function dragstarted(event: d3.D3DragEvent<any, Node, any>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event: d3.D3DragEvent<any, Node, any>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event: d3.D3DragEvent<any, Node, any>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

  }, [graphData]);
  
  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div style={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            style={styles.modalContainer}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <button onClick={onClose} style={styles.closeButton}><X size={20}/></button>
            <div style={styles.contentGrid}>
              {/* Left Side: Graph */}
              <div style={styles.graphContainer}>
                <svg ref={svgRef} style={styles.svg}></svg>
                {graphData.nodes.length === 0 && !isLoading && (
                    <div style={styles.placeholder}>Your generated graph will appear here.</div>
                )}
              </div>

              {/* Right Side: Chat */}
              <div style={styles.chatContainer}>
                <div style={styles.messageList}>
                  {messages.map((msg, index) => (
                    <div key={index} style={styles.messageWrapper(msg.role)}>
                       {msg.role !== 'user' && <Bot size={20} style={styles.avatar} />}
                       <div style={styles.messageBubble(msg.role)}>{msg.content}</div>
                       {msg.role === 'user' && <User size={20} style={styles.avatar} />}
                    </div>
                  ))}
                  {isLoading && <div style={styles.messageWrapper('assistant')}><Loader2 size={16} className="animate-spin" /></div>}
                  <div ref={messagesEndRef} />
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSubmitQuery(); }}
                  style={styles.inputForm}
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Ask a question to build a graph..."
                    style={styles.chatInput}
                    disabled={isLoading}
                  />
                  <button type="submit" style={styles.sendButton} disabled={isLoading || !inputQuery.trim()}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Styles ---
const styles: { [key: string]: React.CSSProperties | ((role: Message['role']) => React.CSSProperties) } = {
    overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
    modalContainer: { width: '90%', height: '85vh', maxWidth: '1400px', background: '#111827', borderRadius: '1rem', border: '1px solid #374151', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
    closeButton: { position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' },
    contentGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', flex: 1, height: '100%' },
    graphContainer: { borderRight: '1px solid #374151', position: 'relative', overflow: 'hidden' },
    svg: { width: '100%', height: '100%' },
    placeholder: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#6b7280' },
    chatContainer: { display: 'flex', flexDirection: 'column', height: '100%' },
    messageList: { flex: 1, padding: '1.5rem', overflowY: 'auto' },
    messageWrapper: (role) => ({ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem', justifyContent: role === 'user' ? 'flex-end' : 'flex-start' }),
    avatar: { color: '#9ca3af', flexShrink: 0 },
    messageBubble: (role) => ({ padding: '0.75rem 1rem', borderRadius: '1rem', maxWidth: '100%', color: role === 'user' ? '#fff' : '#e5e7eb', background: role === 'user' ? '#4f46e5' : '#374151' }),
    inputForm: { display: 'flex', padding: '1rem', borderTop: '1px solid #374151' },
    chatInput: { flex: 1, background: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem', color: '#fff', padding: '0.75rem' },
    sendButton: { background: '#4f46e5', border: 'none', color: '#fff', padding: '0.75rem', borderRadius: '0.5rem', marginLeft: '0.5rem', cursor: 'pointer' },
};

export default GraphChatModal;