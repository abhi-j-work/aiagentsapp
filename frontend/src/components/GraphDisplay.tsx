// src/components/GraphDisplay.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Network, DataSet, IdType, Node, Edge, DataView, Options } from 'vis-network/standalone/esm/vis-network';
import { GraphData, HighlightPath } from '../types';
import GraphControls from './GraphControls';

// --- TYPE DEFINITIONS ---
interface VisNode extends Node {
  type: string;
  originalColor?: string | object;
  degree?: number;
}
interface VisEdge extends Edge {}

// --- PROPS ---
interface GraphDisplayProps {
  graphData: GraphData | null;
  highlightedPath: HighlightPath | null;
  isLoading: boolean;
  error: string | null;
}

// --- LEGEND ---
const GraphLegend: React.FC = () => (
  <div id="kg_legend">
    <div style={{ fontWeight: 700, marginBottom: '6px' }}>Graph Legend</div>
    <div><span className="sw" style={{ background: '#00ffcc' }}></span> Highlighted Path</div>
    <div><span className="sw" style={{ background: '#a78bfa' }}></span> Material</div>
    <div><span className="sw" style={{ background: '#64d4ff' }}></span> Device</div>
    <div><span className="sw" style={{ background: '#ffd86b' }}></span> Process</div>
    <div><span className="sw" style={{ background: '#ff8fab' }}></span> Contaminant</div>
  </div>
);

// --- MAIN COMPONENT ---
const GraphDisplay: React.FC<GraphDisplayProps> = ({ graphData, highlightedPath, isLoading, error }) => {
  const visJsRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const pulseAnimationRef = useRef<number | null>(null);
  
  const nodesRef = useRef(new DataSet<VisNode>());
  const edgesRef = useRef(new DataSet<VisEdge>());
  
  const originalNodeStyles = useRef<Record<IdType, { color: any, size: number | undefined }>>({});

  const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(true);
  const [allGroups, setAllGroups] = useState<Set<string>>(new Set());
  const [visibleGroups, setVisibleGroups] = useState<Set<string>>(new Set());
  const [searchKey, setSearchKey] = useState(0);

  // --- 1. INITIALIZE NETWORK (RUNS ONCE) ---
  useEffect(() => {
    if (!visJsRef.current) return;
    const options: Options = {
      physics: {
        enabled: true,
        solver: "forceAtlas2Based",
        forceAtlas2Based: {
          gravitationalConstant: -100,
          centralGravity: 0.01,
          springLength: 200,
          springConstant: 0.08,
        },
        minVelocity: 0.75,
      },
      nodes: { shape: 'dot' },
      edges: { width: 1, color: { color: 'rgba(232, 238, 246, 0.3)' }, arrows: { to: { enabled: true, scaleFactor: 0.7 } } },
      interaction: { hover: true, tooltipDelay: 200 }
    };
    const network = new Network(visJsRef.current, { nodes: nodesRef.current, edges: edgesRef.current }, options);
    network.on("stabilizationIterationsDone", () => {
      network.setOptions({ physics: false });
      setIsPhysicsEnabled(false);
    });
    networkRef.current = network;
    return () => {
      if (pulseAnimationRef.current) cancelAnimationFrame(pulseAnimationRef.current);
      network.destroy();
      networkRef.current = null;
    };
  }, []);

  // --- 2. THE AUTHORITATIVE DRAWING EFFECT ---
  // This single effect handles all static drawing and styling.
  // It runs whenever the data OR the highlight path changes, ensuring perfect synchronization.
  useEffect(() => {
    // Stop any animations before redrawing
    if (pulseAnimationRef.current) {
        cancelAnimationFrame(pulseAnimationRef.current);
        pulseAnimationRef.current = null;
    }

    if (!graphData) {
      nodesRef.current.clear();
      edgesRef.current.clear();
      originalNodeStyles.current = {};
      return;
    }

    const uniqueGroups = new Set<string>();
    
    // Step A: Create all node objects with their base styles
    const newNodes: VisNode[] = graphData.nodes.map(n => {
      uniqueGroups.add(n.type);
      const style = {
          color: n.color ? { background: n.color, border: n.color } : undefined,
          size: n.size,
      };
      originalNodeStyles.current[n.id] = style;
      return {
        id: n.id, label: n.id, type: n.type, ...style, font: n.font,
        title: `<b>${n.id}</b><br>Type: ${n.type}`
      };
    });

    // Step B: If a highlight path exists, modify the node objects before they are added
    if (highlightedPath && highlightedPath.nodes.length > 0) {
        const highlightSet = new Set(highlightedPath.nodes);
        newNodes.forEach(node => {
            if (node.id && highlightSet.has(node.id)) {
                node.color = { background: '#00ffcc', border: '#00ffcc' };
                node.shadow = { enabled: true, color: '#00ffcc', size: 30 };
            }
        });
    }

    // Step C: Clear old data and add the new, fully styled data in one go
    nodesRef.current.clear();
    edgesRef.current.clear();
    nodesRef.current.add(newNodes);
    edgesRef.current.add(graphData.relationships.map(r => ({ from: r.source, to: r.target, label: r.label })));

    setAllGroups(uniqueGroups);
    setVisibleGroups(uniqueGroups);
    
    // Step D: Fit the view appropriately
    if (highlightedPath && highlightedPath.nodes.length > 0) {
        networkRef.current?.fit({ nodes: highlightedPath.nodes, animation: true });
    } else {
        networkRef.current?.fit();
    }
  }, [graphData, highlightedPath]); // CRITICAL: This effect now synchronizes on both props.
  
  // --- 3. DEDICATED ANIMATION EFFECT ---
  // This effect ONLY handles the pulsing animation.
  useEffect(() => {
    // Always clean up the previous animation frame loop
    if (pulseAnimationRef.current) {
        cancelAnimationFrame(pulseAnimationRef.current);
        pulseAnimationRef.current = null;
    }

    if (highlightedPath && highlightedPath.nodes.length > 0) {
        const { nodes: nodeIds } = highlightedPath;
        
        const baseSizes: Record<IdType, number> = {};
        nodeIds.forEach(id => {
            baseSizes[id] = originalNodeStyles.current[id]?.size || 25;
        });

        let phase = 0;
        const pulse = () => {
            phase += 0.12;
            const updates = nodeIds.map(id => ({
                id: id, size: (baseSizes[id] || 25) + 6.0 * Math.abs(Math.sin(phase)),
            }));
            // This is safe because the nodes are guaranteed to exist
            nodesRef.current.update(updates);
            pulseAnimationRef.current = requestAnimationFrame(pulse);
        };
        pulse(); // Start the animation
    }
    
    // Return a cleanup function
    return () => {
        if (pulseAnimationRef.current) {
            cancelAnimationFrame(pulseAnimationRef.current);
        }
    }
  }, [highlightedPath]);


  // --- 4. CONTROL HANDLERS (No changes needed) ---
  const handleFilterChange = useCallback((group: string, isVisible: boolean) => {
    const nodeView = new DataView(nodesRef.current, {
        filter: (node) => {
            const newVisibleGroups = new Set(visibleGroups);
            isVisible ? newVisibleGroups.add(group) : newVisibleGroups.delete(group);
            setVisibleGroups(newVisibleGroups);
            return newVisibleGroups.has(node.type);
        }
    });
    networkRef.current?.setData({ nodes: nodeView, edges: edgesRef.current });
  }, [visibleGroups]);

  const handleSearch = useCallback((query: string) => {
    const network = networkRef.current;
    if (!network) return;
    if (!query) { network.fit(); return; }
    const allNodes = nodesRef.current.get(); 
    const foundNode = allNodes.find(n => n.label?.toLowerCase().includes(query.toLowerCase()));
    if (foundNode?.id) {
      network.focus(foundNode.id, { scale: 1.5, animation: true });
      network.selectNodes([foundNode.id]);
    }
  }, []);
  
  const handleTogglePhysics = useCallback(() => {
    const network = networkRef.current;
    if (!network) return;
    const newState = !isPhysicsEnabled;
    setIsPhysicsEnabled(newState);
    network.setOptions({ physics: { enabled: newState } });
  }, [isPhysicsEnabled]);

  const handleResetView = useCallback(() => {
    const network = networkRef.current;
    if (!network) return;
    setVisibleGroups(allGroups);
    setSearchKey(k => k + 1);
    network.fit();
    network.unselectAll();
  }, [allGroups]);


  const handleUnclusterAll = useCallback(() => {
    const network = networkRef.current;
    if (!network) return;
    nodesRef.current.getIds().forEach(nodeId => {
      if (network.isCluster(nodeId)) network.openCluster(nodeId);
    });
  }, []);
  const handleClusterByType = useCallback(() => {
    const network = networkRef.current;
    if (!network) return;
    handleUnclusterAll();
    const typesToCluster = Array.from(allGroups);
    typesToCluster.forEach(nodeType => {
      network.cluster({
        joinCondition: (node: VisNode) => node.type === nodeType,
        clusterNodeProperties: {
          label: `[ ${nodeType} ]`, shape: 'box', color: '#333',
          font: { color: 'white', size: 16 }
        }
      });
    });
  }, [allGroups, handleUnclusterAll]);

  

  // --- 5. RENDER ---
  return (
    <div className="main-graph-container">
      <GraphControls
        allGroups={allGroups} visibleGroups={visibleGroups} searchKey={searchKey}
        onFilterChange={handleFilterChange} onSearch={handleSearch}
        isPhysicsEnabled={isPhysicsEnabled} onTogglePhysics={handleTogglePhysics}
        onResetView={handleResetView} onClusterByType={handleClusterByType}
        onUnclusterAll={handleUnclusterAll}
      />
      <div className="graph-frame">
        {isLoading && <div className="center-overlay">Agent is processing...</div>}
        {error && <div className="center-overlay">Error: {error}</div>}
        <div ref={visJsRef} className="graph-container" />
        <GraphLegend />
      </div>
    </div>
  );
};

export default GraphDisplay;