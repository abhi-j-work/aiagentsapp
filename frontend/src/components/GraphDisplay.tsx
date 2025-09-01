import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { GraphData, SimpleNode, SimpleRelationship } from '../services/api';

interface GraphDisplayProps {
  graphData: GraphData | null;
  highlightedPath: { nodes: string[]; pairs: string[][] } | null;
  isLoading: boolean;
  error: string | null;
}

const GraphDisplay: React.FC<GraphDisplayProps> = ({ graphData, highlightedPath, isLoading, error }) => {
  const visJsRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  const nodes = new DataSet<any>();
  const edges = new DataSet<any>();

  // Base options for the graph visualization
  const options = {
    physics: {
      forceAtlas2Based: {
        gravitationalConstant: -100,
        centralGravity: 0.01,
        springLength: 200,
        springConstant: 0.08,
      },
      minVelocity: 0.75,
      solver: "forceAtlas2Based",
    },
    nodes: {
      shape: 'dot',
      font: {
        color: '#e8eef6',
        size: 14,
      },
      borderWidth: 2,
    },
    edges: {
      width: 1,
      color: {
        color: 'rgba(232, 238, 246, 0.3)',
        highlight: 'rgba(232, 238, 246, 0.7)',
      },
      font: {
          color: '#e8eef6',
          size: 12,
          strokeWidth: 0,
      },
      arrows: {
        to: { enabled: true, scaleFactor: 0.7 },
      },
    },
  };

  // Effect to initialize the network
  useEffect(() => {
    if (visJsRef.current) {
      networkRef.current = new Network(visJsRef.current, { nodes, edges }, options);
    }
    return () => {
      networkRef.current?.destroy();
    };
  }, []); // Runs once on mount

  // Effect to update graph when data changes
  useEffect(() => {
    if (graphData) {
      nodes.clear();
      edges.clear();

      const visNodes = graphData.nodes.map(n => ({
          ...n,
          label: n.id,
          color: n.color ? { background: n.color, border: n.color } : undefined,
      }));

      const visEdges = graphData.relationships.map(r => ({
        from: r.source,
        to: r.target,
        label: r.label,
      }));

      nodes.add(visNodes);
      edges.add(visEdges);

      networkRef.current?.fit();
    } else {
      nodes.clear();
      edges.clear();
    }
  }, [graphData]);

  // Effect to handle highlighting
  useEffect(() => {
    if (!graphData) return;

    // Reset all nodes and edges to default style first
    const nodeUpdates = graphData.nodes.map(n => ({
      id: n.id,
      color: n.color ? { background: n.color, border: n.color } : undefined,
      shadow: false,
    }));
    nodes.update(nodeUpdates);

    const edgeUpdates = graphData.relationships.map(r => ({
      id: edges.get({
        filter: item => (item.from === r.source && item.to === r.target) || (item.from === r.target && item.to === r.source)
      })[0]?.id,
      color: { color: 'rgba(232, 238, 246, 0.3)' },
      width: 1,
    }));
    edges.update(edgeUpdates.filter(e => e.id));

    // Apply new highlights
    if (highlightedPath) {
      const { nodes: nodeIds, pairs } = highlightedPath;

      // Highlight nodes
      const highlightedNodeUpdates = nodeIds.map(id => ({
        id,
        color: { background: '#00ffcc', border: '#00ffcc' },
        shadow: { enabled: true, color: '#00ffcc', size: 30 },
      }));
      nodes.update(highlightedNodeUpdates);

      // Highlight edges
      pairs.forEach(pair => {
        const edge = edges.get({
          filter: item => (item.from === pair[0] && item.to === pair[1]) || (item.from === pair[1] && item.to === pair[0])
        });
        if (edge.length > 0) {
          edges.update({ id: edge[0].id, color: { color: '#00ffcc' }, width: 3 });
        }
      });

      // Focus camera on highlighted nodes
      if (nodeIds.length > 0) {
        networkRef.current?.fit({
          nodes: nodeIds,
          animation: true,
        });
      }
    }
  }, [highlightedPath, graphData]);


  return (
    <div className="glass" style={{ height: '100%', padding: '16px' }}>
      <div className="section-title">Graph Output</div>
      <div className="graph-frame">
        {isLoading && <div style={centerOverlayStyle}>Agent is processing...</div>}
        {error && <div style={centerOverlayStyle}>Error: {error}</div>}
        {!isLoading && !error && !graphData && <div style={centerOverlay_}>Load a document and click "Generate" to begin.</div>}
        <div ref={visJsRef} className="graph-container" />
      </div>
    </div>
  );
};

const centerOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: 'white',
  fontSize: '1.2rem',
  fontWeight: '600',
  textAlign: 'center',
  zIndex: 10,
  background: 'rgba(0,0,0,0.5)',
  padding: '20px',
  borderRadius: '10px',
};

export default GraphDisplay;
