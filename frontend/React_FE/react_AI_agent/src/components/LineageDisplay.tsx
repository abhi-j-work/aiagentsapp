import React, { useLayoutEffect, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    Handle, // <-- 1. IMPORT THE HANDLE COMPONENT
    type Node,
    type Edge,
    useNodesState,
    useEdgesState,
    Position,
    MarkerType,
    BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Table, Eye, AlertTriangle } from 'lucide-react';
import type { LineageResponse } from '../services/api';

// --- Prop Types ---
type LineageDisplayProps = {
    data: LineageResponse;
    centralNodeId: string;
};

// --- Dagre Auto-Layouting Setup ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
const nodeWidth = 180;
const nodeHeight = 40;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    dagreGraph.setGraph({ rankdir: direction });
    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
    dagre.layout(dagreGraph);
    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        // We no longer need to set target/source position here, the handles do it for us.
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
    });
    return { nodes, edges };
};

// --- Custom Node Definitions with EXPLICIT HANDLES ---
const nodeTypes = {
    table: ({ data }: { data: { label: string } }) => (
        <div className="bg-slate-800 border-2 border-teal-500 text-teal-300 rounded-lg px-4 py-2 text-sm shadow-lg flex items-center gap-3">
            {/* 2. ADD EXPLICIT HANDLES */}
            {/* Target handle (for incoming edges) on the left */}
            <Handle type="target" position={Position.Left} className="!bg-teal-500" />
            <Table className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <span className="font-semibold">{data.label}</span>
            {/* Source handle (for outgoing edges) on the right */}
            <Handle type="source" position={Position.Right} className="!bg-teal-500" />
        </div>
    ),
    view: ({ data }: { data: { label: string } }) => (
         <div className="bg-slate-800 border-2 border-indigo-500 text-indigo-300 rounded-lg px-4 py-2 text-sm shadow-lg flex items-center gap-3">
            {/* 2. ADD EXPLICIT HANDLES */}
            <Handle type="target" position={Position.Left} className="!bg-indigo-500" />
            <Eye className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="font-bold">{data.label}</span>
            <Handle type="source" position={Position.Right} className="!bg-indigo-500" />
        </div>
    ),
};

// --- Edge Style Definitions (Unchanged) ---
const edgeLabelStyle = { fontSize: 12, fontWeight: 'bold' };
const edgeLabelBgStyle = { fill: '#18181b', padding: '4px 6px', borderRadius: 4 };

// --- Main Component ---
const LineageDisplay = ({ data, centralNodeId }: LineageDisplayProps) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    
    const hasEdges = useMemo(() => data.edges && data.edges.length > 0, [data.edges]);

    useLayoutEffect(() => {
        if (!data || data.nodes.length === 0) return;

        const initialNodes: Node[] = data.nodes.map(n => ({
            id: n.id, type: n.type, data: { label: n.label }, position: { x: 0, y: 0 },
        }));
        
        const initialEdges: Edge[] = (data.edges || []).map((e, i) => {
            const isUpstream = e.target === centralNodeId;
            const upstreamColor = '#84cc16';
            const downstreamColor = '#0ea5e9';
            const labelUpstreamColor = '#bef264';
            const labelDownstreamColor = '#7dd3fc';

            return {
                id: `e-${e.source}-${e.target}-${i}`, source: e.source, target: e.target, type: 'smoothstep', animated: true,
                label: isUpstream ? 'Source' : 'Dependency',
                labelStyle: { ...edgeLabelStyle, fill: isUpstream ? labelUpstreamColor : labelDownstreamColor },
                labelBgStyle: edgeLabelBgStyle,
                style: { stroke: isUpstream ? upstreamColor : downstreamColor, strokeWidth: 2.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: isUpstream ? upstreamColor : downstreamColor, width: 20, height: 20 },
            };
        });

        if (hasEdges) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        } else {
            const nodesInGrid = initialNodes.map((node, i) => {
                node.position = { x: (i % 3) * (nodeWidth + 80), y: Math.floor(i / 3) * (nodeHeight + 60) };
                return node;
            });
            setNodes(nodesInGrid);
            setEdges([]);
        }
    }, [data, centralNodeId, hasEdges, setNodes, setEdges]);

    return (
        <div className="w-full h-full rounded-lg overflow-hidden relative" data-testid="lineage-display">
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} fitView className="bg-slate-900/70">
                <Background color="#4f46e5" variant={BackgroundVariant.Dots} gap={16} size={0.5} />
                <Controls />
                <MiniMap nodeColor={n => n.type === 'view' ? '#818cf8' : '#5eead4'} nodeStrokeWidth={3} zoomable pannable />
                
                {!hasEdges && nodes.length > 0 && (
                    <div className="absolute top-4 left-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 p-3 rounded-lg text-sm flex items-center gap-3 shadow-lg">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">No relationships found for "{nodes.find(n => n.id === centralNodeId)?.data.label}".</p>
                            <p className="text-yellow-400/80 mt-1">This usually means no FOREIGN KEY constraints are defined in the database.</p>
                        </div>
                    </div>
                )}
            </ReactFlow>
        </div>
    );
};

export default LineageDisplay;