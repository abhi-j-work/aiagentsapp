import React, { useEffect, useState, useRef } from 'react';
import Graph from 'react-graph-vis';
import { GraphData, Node, Edge } from '../types';

interface GraphViewProps {
  graphData: GraphData;
  highlightPath?: { nodes: (string | number)[]; pairs: (string|number)[][] };
}

const GraphView: React.FC<GraphViewProps> = ({ graphData, highlightPath }) => {
  const [graph, setGraph] = useState<GraphData>(graphData);
  const animationFrameId = useRef<number | null>(null);

  const options = {
    layout: {
      hierarchical: false,
    },
    nodes: {
      shape: 'dot',
      borderWidth: 2,
      font: {
        size: 14,
        color: '#e8eef6',
      },
    },
    edges: {
      color: {
        color: 'rgba(255,255,255,0.3)',
        highlight: '#60a5fa',
      },
      arrows: {
        to: { enabled: true, scaleFactor: 0.7 },
      },
      font: {
        color: '#e8eef6',
        size: 10,
        align: 'top',
      },
      smooth: {
        type: 'cubicBezier',
        forceDirection: 'vertical',
        roundness: 0.4,
      },
    },
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -25000,
        centralGravity: 0.1,
        springLength: 150,
      },
      solver: 'barnesHut',
      stabilization: { iterations: 200 },
    },
    interaction: {
      tooltipDelay: 200,
      hover: true,
    },
    height: '100%',
    width: '100%',
  };

  useEffect(() => {
    // Stop any existing animation
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    const baseNodes = graphData.nodes.map(n => {
      const base = { ...n };
      // Base styling by group
      switch(n.group) {
        case 'Process': base.color = { background: '#ffd86b', border: '#ffd86b' }; break;
        case 'Material': base.color = { background: '#a78bfa', border: '#a78bfa' }; break;
        case 'Contaminant': base.color = { background: '#ff8fab', border: '#ff8fab' }; break;
        case 'Device': base.color = { background: '#64d4ff', border: '#64d4ff' }; break;
        default: base.color = { background: '#7aa2ff', border: '#7aa2ff' };
      }
      return base;
    });

    const baseEdges = [...graphData.edges];

    if (highlightPath && highlightPath.nodes.length > 0) {
      const highlightNodeIds = new Set(highlightPath.nodes);
      const highlightEdgePairs = new Set(highlightPath.pairs.map(p => `${p[0]}-${p[1]}`));

      const styledNodes = baseNodes.map(n => {
        if (highlightNodeIds.has(n.id)) {
          return {
            ...n,
            color: { background: '#00ffcc', border: '#00ffcc' },
            size: 30,
            shadow: { enabled: true, color: 'rgba(0, 255, 204, 0.7)', size: 30 },
          };
        }
        return n;
      });

      const styledEdges = baseEdges.map(e => {
        if (highlightEdgePairs.has(`${e.from}-${e.to}`) || highlightEdgePairs.has(`${e.to}-${e.from}`)) {
            return { ...e, color: { color: '#00ffcc' }, width: 3 };
        }
        return e;
      });

      setGraph({ nodes: styledNodes, edges: styledEdges });

      // Pulsing animation
      const baseSizes: { [key: string]: number } = {};
      styledNodes.forEach(n => {
        if (highlightNodeIds.has(n.id)) {
          baseSizes[n.id] = n.size || 30;
        }
      });

      let phase = 0;
      const pulse = () => {
        phase += 0.1;
        const amplitude = 6;
        const updates = styledNodes.map(n => {
          if (highlightNodeIds.has(n.id)) {
            return {
              ...n,
              size: baseSizes[n.id] + amplitude * Math.abs(Math.sin(phase)),
            };
          }
          return n;
        });
        setGraph(prev => ({ ...prev, nodes: updates }));
        animationFrameId.current = requestAnimationFrame(pulse);
      };
      animationFrameId.current = requestAnimationFrame(pulse);

    } else {
      setGraph({ nodes: baseNodes, edges: baseEdges });
    }

    // Cleanup on unmount
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [graphData, highlightPath]);

  return (
    <div className="graph-frame">
      <div id="kg_legend">
        <div style={{fontWeight: 700, marginBottom: '6px'}}>Graph Legend</div>
        <div><span className="sw" style={{background:'#00ffcc'}}></span> Discovered Path(s)</div>
        <div><span className="sw" style={{background:'#a78bfa'}}></span> Materials</div>
        <div><span className="sw" style={{background:'#64d4ff'}}></span> Devices</div>
        <div><span className="sw" style={{background:'#ffd86b'}}></span> Processes</div>
      </div>
      <Graph
        key={JSON.stringify(graphData)} // Re-mount component if base data changes
        graph={graph}
        options={options}
      />
    </div>
  );
};

export default GraphView;
