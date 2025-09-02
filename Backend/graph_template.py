# Backend/graph_template.py

import json
from models import KnowledgeGraphResponse

def create_graph_html(graph_data: KnowledgeGraphResponse, insight: dict) -> str:
    """
    Generates the final, corrected, and feature-rich HTML knowledge graph.
    This version fixes the JavaScript race condition and ensures all features load correctly.
    """
    nodes_list = []
    for node in graph_data.nodes:
        node_dict = node.dict()
        node_dict['label'] = node.id
        node_dict['group'] = node.type
        node_dict['font'] = {"color": "white"}
        node_dict['shape'] = "dot"
        node_dict['title'] = node.type
        nodes_list.append(node_dict)

    edges_list = [{"from": rel.source, "to": rel.target, "label": rel.type, "arrows": "to"} for rel in graph_data.relationships]

    nodes_json = json.dumps(nodes_list)
    edges_json = json.dumps(edges_list)
    highlight_nodes_json = json.dumps(insight.get("nodes", []))

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>AI Knowledge Graph</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/dist/vis-network.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tom-select/2.0.0-rc.4/css/tom-select.bootstrap5.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/tom-select/2.0.0-rc.4/js/tom-select.complete.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            html, body {{ margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; font-family: sans-serif; }}
            #mynetwork {{
                width: 100%; height: 100vh;
                background-color: #21262D;
                position: absolute; top: 0; left: 0; z-index: 1;
            }}
            /* Additional styles for legend, filter, etc. */
            #kg_legend {{
                position: fixed; right: 20px; top: 80px; z-index: 999;
                background: rgba(22, 27, 34, 0.9); color: #E6EDF3;
                padding: 10px 12px; border-radius: 8px; font-size: 13px;
                border: 1px solid #30363D;
            }}
            #kg_legend .sw {{ display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:8px; vertical-align:middle; }}
        </style>
    </head>
    <body>
        <div id="mynetwork"></div>

        <script type="text/javascript">
            // --- Global Variables ---
            var nodes, edges, network, nodeColors = {{}};
            var highlightActive = false;

            /**
             * Main function to initialize the graph.
             */
            function drawGraph() {{
                nodes = new vis.DataSet({nodes_json});
                edges = new vis.DataSet({edges_json});
                
                var container = document.getElementById('mynetwork');
                var data = {{ nodes: nodes, edges: edges }};
                var options = {{
                    physics: {{
                        barnesHut: {{
                            gravitationalConstant: -50000,
                            centralGravity: 0.1,
                            springLength: 200,
                            avoidOverlap: 0.8
                        }},
                        solver: 'barnesHut'
                    }},
                    interaction: {{ hover: true }}
                }};
                
                // 1. Create the network object
                network = new vis.Network(container, data, options);
                
                // 2. NOW that network exists, set up advanced features
                setupAdvancedFeatures();

                // 3. Attach the click event listener for neighborhood highlighting
                network.on("click", neighbourhoodHighlight);
            }}

            /**
             * This function contains all the advanced styling, highlighting, and animation logic.
             * It is only called AFTER the main network object has been created.
             */
            function setupAdvancedFeatures() {{
                const HIGHLIGHT_NODES = {highlight_nodes_json};
                const PULSE_ENABLED = true;
                const PULSE_AMPLITUDE = 8.0;
                const PULSE_STEP = 0.09;

                function applyGlobalStyles() {{
                    const deg = {{}};
                    edges.get().forEach(e => {{ deg[e.from] = (deg[e.from] || 0) + 1; deg[e.to] = (deg[e.to] || 0) + 1; }});
                    let maxDeg = Math.max(...Object.values(deg).map(Number), 1);
                    
                    const updates = nodes.get().map(n => {{
                        const d = deg[n.id] || 0;
                        const size = Math.round(15 + (d / maxDeg) * 30);
                        let paletteColor = '#95A5A6'; // Default
                        const g = String(n.group).toLowerCase();
                        if(g.includes('process')) paletteColor = '#9B59B6';
                        else if(g.includes('material')) paletteColor = '#E74C3C';
                        else if(g.includes('company')) paletteColor = '#2ECC71';
                        else if(g.includes('device')) paletteColor = '#E67E22';
                        else if(g.includes('technology')) paletteColor = '#3498DB';
                        return {{ id: n.id, size: size, color: {{ background: paletteColor, border: paletteColor }}, font: {{ size: Math.max(12, Math.round(size * 0.6)) }} }};
                    }});
                    nodes.update(updates);
                }}

                function applyHighlight() {{
                    if (HIGHLIGHT_NODES.length === 0) return;
                    nodes.update(HIGHLIGHT_NODES.map(id => ({{
                        id: id,
                        color: {{ background: '#00ffcc', border: '#00ffcc' }},
                        shadow: {{ enabled: true, color: '#00ffcc', size: 40 }}
                    }})));
                    
                    if (!PULSE_ENABLED) return;
                    const baseSizes = {{}};
                    HIGHLIGHT_NODES.forEach(id => baseSizes[id] = nodes.get(id)?.size || 20);
                    let phase = 0;
                    function raf() {{
                        phase += PULSE_STEP;
                        const updates = HIGHLIGHT_NODES.map(id => ({{
                            id: id, size: baseSizes[id] + PULSE_AMPLITUDE * Math.abs(Math.sin(phase))
                        }}));
                        nodes.update(updates);
						window.requestAnimationFrame(raf);
                    }};
                    raf();
                }}
                
                function injectLegend() {{
                    const div = document.createElement('div');
                    div.id = 'kg_legend';
                    div.innerHTML = `<div style="font-weight:700;margin-bottom:6px">Graph Legend</div>
                        <div><span class="sw" style="background:#00ffcc"></span> Insight Path</div>
                        <div><span class="sw" style="background:#2ECC71"></span> Company</div>
                        <div><span class="sw" style="background:#3498DB"></span> Technology</div>
                        <div><span class="sw" style="background:#9B59B6"></span> Process</div>
                        <div><span class="sw" style="background:#E74C3C"></span> Material</div>`;
                    document.body.appendChild(div);
                }}

                // This is the function that runs once the graph physics have settled.
                function onReady() {{
                    applyGlobalStyles();
                    applyHighlight();
                    injectLegend();
                    // Store the final calculated colors for use in neighborhood highlighting
                    nodes.get().forEach(node => nodeColors[node.id] = node.color);
                }}
                
                // This is the correct way to attach the listener.
                network.once('stabilizationIterationsDone', onReady);
            }}
            
            function neighbourhoodHighlight(params) {{
                if (params.nodes.length > 0) {{
                    highlightActive = true;
                    var selectedNode = params.nodes[0];
                    var connectedNodes = network.getConnectedNodes(selectedNode);
                    connectedNodes.push(selectedNode);

                    var allNodeData = nodes.get();
                    var updates = allNodeData.map(node => {{
                        if (!connectedNodes.includes(node.id)) {{
                            node.color = "rgba(150,150,150,0.2)"; // Fade out non-neighbors
                        }} else {{
                            node.color = nodeColors[node.id]; // Restore original color for neighbors
                        }}
                        return node;
                    }});
                    nodes.update(updates);
                }} else if (highlightActive) {{
                    highlightActive = false;
                    var allNodeData = nodes.get();
                    var updates = allNodeData.map(node => {{
                        node.color = nodeColors[node.id]; // Restore all original colors
                        return node;
                    }});
                    nodes.update(updates);
                }}
            }}

            // --- Start Everything ---
            drawGraph();
        </script>
    </body>
    </html>
    """