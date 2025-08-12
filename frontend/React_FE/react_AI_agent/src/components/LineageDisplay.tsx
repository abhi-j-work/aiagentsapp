import React, { useLayoutEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    useNodesState,
    useEdgesState,
    Position,
    // FIX 1: Import the specific enum types from the library
    MarkerType,
    BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { Table, Eye } from 'lucide-react';
import type { LineageResponse } from '../services/api';

// --- Prop Types for the Component (Unchanged) ---
type LineageDisplayProps = {
    data: LineageResponse;
};

// --- Dagre Auto-Layouting Setup (Unchanged) ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 180;
const nodeHeight = 40;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = Position.Left;
        node.sourcePosition = Position.Right;

        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
    });

    return { nodes, edges };
};


// --- Custom Node Definitions (Unchanged) ---
const nodeTypes = {
    table: ({ data }: { data: { label: string } }) => (
        <div className="bg-slate-800 border-2 border-teal-500 text-teal-300 rounded-lg px-4 py-2 text-sm shadow-lg flex items-center gap-3">
            <Table className="w-4 h-4 text-teal-500 flex-shrink-0" />
            <span className="font-semibold">{data.label}</span>
        </div>
    ),
    view: ({ data }: { data: { label: string } }) => (
         <div className="bg-slate-800 border-2 border-indigo-500 text-indigo-300 rounded-lg px-4 py-2 text-sm shadow-lg flex items-center gap-3">
            <Eye className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="font-bold">{data.label}</span>
        </div>
    ),
};


// --- The Main Component (with fixes) ---
const LineageDisplay = ({ data }: LineageDisplayProps) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    useLayoutEffect(() => {
        if (!data || data.nodes.length === 0) return;

        const initialNodes: Node[] = data.nodes.map(n => ({
            id: n.id,
            type: n.type,
            data: { label: n.label },
            position: { x: 0, y: 0 },
        }));

        // FIX 2: Correctly type the markerEnd using the imported MarkerType enum
        const initialEdges: Edge[] = data.edges.map((e, i) => ({
            id: `e-${e.source}-${e.target}-${i}`,
            source: e.source,
            target: e.target,
            type: 'smoothstep',
            animated: true,
            markerEnd: {
                type: MarkerType.ArrowClosed, // Use the enum here
                color: '#a78bfa',
            },
        }));

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            initialNodes,
            initialEdges
        );
        
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

    }, [data, setNodes, setEdges]);

    return (
        <div className="w-full h-full rounded-lg overflow-hidden" data-testid="lineage-display">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                className="bg-slate-900/70"
            >
                {/* FIX 3: Correctly type the variant using the imported BackgroundVariant enum */}
                <Background
                    color="#4f46e5"
                    variant={BackgroundVariant.Dots} // Use the enum here
                    gap={16}
                    size={0.5}
                />
                <Controls />
                <MiniMap nodeColor={n => n.type === 'view' ? '#818cf8' : '#5eead4'} nodeStrokeWidth={3} zoomable pannable />
            </ReactFlow>
        </div>
    );
};

export default LineageDisplay;