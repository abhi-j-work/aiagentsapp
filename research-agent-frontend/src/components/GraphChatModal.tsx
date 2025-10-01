import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, X, Bot, User, Code, FileJson } from "lucide-react";
import ReactMarkdown from 'react-markdown';

// --- Type Imports ---
// This Message type should be exported from your App.tsx or models.ts
// It must include these optional properties for the interactive features to work.
export interface Message {
  role: "user" | "assistant" | "error";
  content: string;
  cypher?: string;
  results?: any;
}

const API_URL = "http://localhost:8002";

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

// --- Prop Types ---
interface GraphChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- A Sub-Component for Interactive Assistant Messages ---
const AssistantMessage = ({ msg }: { msg: Message }) => {
  const [isCypherVisible, setCypherVisible] = useState(false);
  const [isJsonVisible, setJsonVisible] = useState(false);

  return (
    <div style={styles.messageWrapper(msg.role)}>
      <Bot size={20} style={styles.avatar} />
      <div style={styles.messageBubble(msg.role)}>
        <ReactMarkdown>{msg.content}</ReactMarkdown>
        
        {(msg.cypher || msg.results) && (
          <div style={styles.chatActionsContainer}>
            {msg.cypher && (
              <button onClick={() => setCypherVisible(!isCypherVisible)} style={styles.chatActionButton}>
                <Code size={14} />
                <span>{isCypherVisible ? 'Hide' : 'Show'} Cypher</span>
              </button>
            )}
            {msg.results && (
              <button onClick={() => setJsonVisible(!isJsonVisible)} style={styles.chatActionButton}>
                <FileJson size={14} />
                <span>{isJsonVisible ? 'Hide' : 'Show'} JSON</span>
              </button>
            )}
          </div>
        )}
        
        <AnimatePresence>
          {isCypherVisible && msg.cypher && (
            <motion.pre {...codeAnimation} style={styles.codeBlock}>
              <code>{msg.cypher}</code>
            </motion.pre>
          )}
          {isJsonVisible && msg.results && (
            <motion.pre {...codeAnimation} style={styles.codeBlock}>
              <code>{JSON.stringify(msg.results, null, 2)}</code>
            </motion.pre>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};


// --- The Main Modal Component ---
const GraphChatModal: React.FC<GraphChatModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! Ask a question like 'Show the entire graph with connections', and I will generate the knowledge graph for you.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  
  const svgRef = useRef<SVGSVGElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSubmitQuery = async () => {
    if (!inputQuery.trim()) return;
    const userMessage: Message = { role: "user", content: inputQuery };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInputQuery("");
    setGraphData({ nodes: [], edges: [] }); // Clear previous graph

    try {
      const res = await fetch(`${API_URL}/api/graph/text-to-cypher?useLLM=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userMessage.content }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      
      const extractedNodes: Node[] = [];
      const extractedEdges: Edge[] = [];
      const nodeIds = new Set<string>();

      if (data.results?.length) {
        data.results.forEach((row: any) => {
          Object.values(row).forEach((entity: any) => {
            if (!entity) return;

            if (Array.isArray(entity) && entity.length === 3 && typeof entity[1] === 'string') {
              const sourceNode = entity[0];
              const targetNode = entity[2];
              
              if (sourceNode?.id && targetNode?.id) {
                extractedEdges.push({
                  source: sourceNode.id.toString(),
                  target: targetNode.id.toString(),
                  type: entity[1],
                });
                // Also add the nodes from the relationship if they haven't been seen
                if (!nodeIds.has(sourceNode.id.toString())) {
                    nodeIds.add(sourceNode.id.toString());
                    extractedNodes.push({ id: sourceNode.id.toString(), name: sourceNode.name || sourceNode.id, ...sourceNode });
                }
                if (!nodeIds.has(targetNode.id.toString())) {
                    nodeIds.add(targetNode.id.toString());
                    extractedNodes.push({ id: targetNode.id.toString(), name: targetNode.name || targetNode.id, ...targetNode });
                }
              }
            } 
            else if (typeof entity === 'object') {
              if (entity.source && entity.target && entity.type) {
                extractedEdges.push({
                  source: entity.source.toString(),
                  target: entity.target.toString(),
                  type: entity.type,
                });
              } 
              else if (entity.id && !nodeIds.has(entity.id.toString())) {
                const nodeId = entity.id.toString();
                nodeIds.add(nodeId);
                extractedNodes.push({
                  id: nodeId,
                  name: entity.name || entity.type || nodeId,
                  ...entity,
                });
              }
            }
          });
        });
      }
      
      const assistantMessage: Message = {
        role: "assistant",
        content: `I found ${extractedNodes.length} nodes and ${extractedEdges.length} relationships. The graph is now displayed.`,
        cypher: data.cypher,
        results: data.results,
      };
      setMessages(prev => [...prev, assistantMessage]);
      setGraphData({ nodes: extractedNodes, edges: extractedEdges });

    } catch (err: any) {
      console.error(err);
      const errorMessage: Message = { role: "error", content: err.message || "Failed to fetch graph." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (graphData.nodes.length === 0) {
      svg.selectAll("*").remove();
      return;
    }
    svg.selectAll("*").remove();

    const width = svg.node()!.getBoundingClientRect().width;
    const height = svg.node()!.getBoundingClientRect().height;

    const simulation = d3
      .forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.edges).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    const g = svg.append("g");
    const link = g.append("g").attr("stroke", "#999").attr("stroke-opacity", 0.6).selectAll("line").data(graphData.edges).join("line");
    const node = g.append("g").selectAll("g").data(graphData.nodes).join("g").call(d3.drag<any, Node>().on("start", dragstarted).on("drag", dragged).on("end", dragended));

    node.append("circle").attr("r", 15).attr("fill", "#6366f1").attr("stroke", "#a5b4fc").attr("stroke-width", 2);
    node.append("text").text(d => d.name || d.id).attr("x", 20).attr("y", 5).attr("fill", "#e5e7eb").attr("font-size", 12);

    simulation.on("tick", () => {
      link.attr("x1", d => (d.source as any).x).attr("y1", d => (d.source as any).y).attr("x2", d => (d.target as any).x).attr("y2", d => (d.target as any).y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    function dragstarted(event: any, d: Node) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
    function dragged(event: any, d: Node) { d.fx = event.x; d.fy = event.y; }
    function dragended(event: any, d: Node) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
  }, [graphData]);
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div style={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div style={styles.modalContainer} {...modalAnimation}>
            <motion.button onClick={onClose} style={styles.closeButton} whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.8)' }} whileTap={{ scale: 0.95 }}>
              <X size={20}/>
            </motion.button>
            <div style={styles.contentGrid}>
              <div style={styles.graphContainer}>
                <svg ref={svgRef} style={styles.svg}></svg>
                {graphData.nodes.length === 0 && !isLoading && (
                    <div style={styles.placeholder}>Your generated graph will appear here.</div>
                )}
              </div>
              <div style={styles.chatContainer}>
                <div style={styles.messageList}>
                  {messages.map((msg, index) => msg.role === 'user' ? (
                      <div key={index} style={styles.messageWrapper('user')}>
                        <div style={styles.messageBubble('user')}>{msg.content}</div>
                        <User size={20} style={styles.avatar} />
                      </div>
                    ) : (
                      <AssistantMessage key={index} msg={msg} />
                    )
                  )}
                  {isLoading && 
                    <div style={styles.messageWrapper('assistant')}>
                      <Bot size={20} style={styles.avatar} />
                      <div style={styles.messageBubble('assistant')}><Loader2 size={16} className="animate-spin" /></div>
                    </div>
                  }
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuery(); }} style={styles.inputForm}>
                  <input type="text" value={inputQuery} onChange={(e) => setInputQuery(e.target.value)} placeholder="Ask a question..." style={styles.chatInput} disabled={isLoading}/>
                  <button type="submit" style={styles.sendButton} disabled={isLoading || !inputQuery.trim()}><Send size={18} /></button>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Animations & Styles ---
const modalAnimation = { initial: { scale: 0.95, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.95, opacity: 0 }, transition: { duration: 0.3, ease: 'easeInOut' } };
const codeAnimation = { initial: { opacity: 0, height: 0, marginTop: 0 }, animate: { opacity: 1, height: 'auto', marginTop: '0.75rem' }, exit: { opacity: 0, height: 0, marginTop: 0 } };
const styles: { [key: string]: React.CSSProperties | ((role: Message['role']) => React.CSSProperties) } = {
    overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' },
    modalContainer: { width: '90%', height: '85vh', maxWidth: '1400px', background: '#111827', borderRadius: '1rem', border: '1px solid #374151', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
    closeButton: { position: 'absolute', top: '0.75rem', right: '0.75rem', background: 'rgba(31, 41, 55, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(5px)', color: '#e5e7eb', cursor: 'pointer', zIndex: 10, borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease-in-out' },
    contentGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', flex: 1, height: '100%' },
    graphContainer: { borderRight: '1px solid #374151', position: 'relative', overflow: 'hidden', background: '#0c1120' },
    svg: { width: '100%', height: '100%' },
    placeholder: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#6b7280', fontSize: '1.2rem' },
    chatContainer: { display: 'flex', flexDirection: 'column', height: '100%' },
    messageList: { flex: 1, padding: '1.5rem', overflowY: 'auto' },
    messageWrapper: (role) => ({ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem', justifyContent: role === 'user' ? 'flex-end' : 'flex-start' }),
    avatar: { color: '#9ca3af', flexShrink: 0, marginTop: '0.25rem' },
    messageBubble: (role) => ({ padding: '0.75rem 1rem', borderRadius: '1rem', maxWidth: '100%', color: role === 'error' ? '#fecaca' : (role === 'user' ? '#fff' : '#e5e7eb'), background: role === 'error' ? '#7f1d1d' : (role === 'user' ? '#4f46e5' : '#374151') }),
    chatActionsContainer: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' },
    chatActionButton: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', padding: '0.25rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'background-color 0.2s' },
    codeBlock: { padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#c7d2fe', maxHeight: '200px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
    inputForm: { display: 'flex', padding: '1rem', borderTop: '1px solid #374151' },
    chatInput: { flex: 1, background: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem', color: '#fff', padding: '0.75rem', outline: 'none' },
    sendButton: { background: '#4f46e5', border: 'none', color: '#fff', padding: '0.75rem', borderRadius: '0.5rem', marginLeft: '0.5rem', cursor: 'pointer' },
};

export default GraphChatModal;