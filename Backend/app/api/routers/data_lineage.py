import json
import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, logger
from sqlalchemy import create_engine, inspect
from app.api import models
from app.api.routers.data_governance import _get_conn_str
from app.core.config import Settings, get_settings
from app.services import db_service
from app.services.errors import DatabaseServiceError
from app.services import lineage_service
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ValidationError

# --- Project Module Imports ---
# Adopting the structure from your provided code
from app.core.config import Settings, get_settings
from app.api import models
from app.services import db_service, llm_service
from app.services.errors import DatabaseServiceError, LLMServiceError

logger = logging.getLogger(__name__)    
router = APIRouter(
    prefix="/data-estate",
    tags=["Data Lineage"]
)
 
@router.post("/lineage", response_model=models.LineageResponse)
async def get_data_lineage(params: models.LineageRequest, settings: Settings = Depends(get_settings)):
    """
    Generates a data lineage graph for a given database table or view,
    now including primary key information for each table node.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        object_name = params.object_name
        object_type = await db_service.get_object_type(conn_str, object_name)
 
        if not object_type:
            raise HTTPException(status_code=404, detail=f"Object '{object_name}' not found.")
 
        # Use a temporary list of dictionaries to build the nodes
        nodes_data = []
        edges = []
       
        central_node_type = 'view' if object_type == 'VIEW' else 'table'
        central_node_id = f"{central_node_type}_{object_name}"
        nodes_data.append({"id": central_node_id, "type": central_node_type, "label": object_name})
 
        # Step 2: Discover all related nodes (same as before)
        if object_type == 'VIEW':
            sql_definition = await db_service.get_view_definition(conn_str, object_name)
            if not sql_definition:
                 raise HTTPException(status_code=404, detail=f"Could not get definition for '{object_name}'.")
           
            lineage_info = lineage_service.a_parse_sql_lineage(sql_definition)
            for source_table in lineage_info["sources"]:
                source_node_id = f"table_{source_table}"
                if not any(n["id"] == source_node_id for n in nodes_data):
                    nodes_data.append({"id": source_node_id, "type": "table", "label": str(source_table)})
                edges.append({"source": source_node_id, "target": central_node_id})
        else: # BASE TABLE
            upstream, downstream = await db_service.get_table_lineage_details(conn_str, object_name)
            for up_table in upstream:
                up_node_id = f"table_{up_table}"
                if not any(n["id"] == up_node_id for n in nodes_data):
                    nodes_data.append({"id": up_node_id, "type": "table", "label": up_table})
                edges.append({"source": up_node_id, "target": central_node_id})
            for down_table in downstream:
                down_node_id = f"table_{down_table}"
                if not any(n["id"] == down_node_id for n in nodes_data):
                    nodes_data.append({"id": down_node_id, "type": "table", "label": down_table})
                edges.append({"source": central_node_id, "target": down_node_id})
       
        # --- NEW ENRICHMENT STEP ---
        # 1. Get a list of all table labels from the nodes we just discovered.
        table_labels = [n['label'] for n in nodes_data if n['type'] == 'table']
       
        # 2. Fetch the primary keys for ONLY those tables in a single DB call.
        pk_map = await db_service.get_primary_keys_for_tables(conn_str, table_labels)
       
        # 3. Add the 'primary_key' field to each node dictionary.
        for node in nodes_data:
            if node['type'] == 'table':
                # .get() safely returns None if the table has no PK or wasn't found
                node['primary_key'] = pk_map.get(node['label'])
 
        # Pydantic will validate the final enriched structure
        return models.LineageResponse(nodes=nodes_data, edges=edges)
 
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error getting lineage for '{params.object_name}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")
 
@router.post("/list-database-objects", response_model=models.ListObjectsResponse)
async def list_database_objects(params: models.DBParams, settings: Settings = Depends(get_settings)):
    """
    Lists all user-defined tables (with their primary keys) and views
    from the public schema.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        tables, views = await db_service.list_all_tables_and_views(conn_str)
       
        return models.ListObjectsResponse(tables=tables, views=views)
 
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error listing database objects: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")
    
#New API For detailed schema
def _extract_data_estate_sync(conn_str: str) -> Dict[str, Any]:
    """
    Synchronously inspects the database to extract a detailed schema
    structured for knowledge graph creation.
    """
    try:
        engine = create_engine(conn_str)
        inspector = inspect(engine)
        data_estate = {}

        schema_names = [s for s in inspector.get_schema_names() if not s.startswith('pg_') and s != 'information_schema']
        if not schema_names:
            schema_names = [None]  # Use default schema if no specific ones are found

        for schema_name in schema_names:
            table_names = inspector.get_table_names(schema=schema_name)
            for table_name in table_names:
                fqn = f"{schema_name}.{table_name}" if schema_name else table_name
                
                # Extract columns
                columns = []
                for col in inspector.get_columns(table_name, schema=schema_name):
                    columns.append({
                        "columnName": col.get('name'),
                        "dataType": str(col.get('type')),
                        "isNullable": col.get('nullable'),
                        "defaultValue": str(col.get('default')) if col.get('default') is not None else None,
                        "isAutoIncrementing": col.get('autoincrement', False),
                        "comment": col.get('comment')
                    })
                
                # Extract Primary Key
                pk_constraint = inspector.get_pk_constraint(table_name, schema=schema_name)
                primary_key = {
                    "constraintName": pk_constraint.get('name'),
                    "constrainedColumns": pk_constraint.get('constrained_columns', [])
                } if pk_constraint else None

                # Extract Foreign Keys
                fks = []
                for fk in inspector.get_foreign_keys(table_name, schema=schema_name):
                    target_schema = fk.get('referred_schema')
                    target_table_name = fk.get('referred_table')
                    target_fqn = f"{target_schema}.{target_table_name}" if target_schema else target_table_name
                    fks.append({
                        "constraintName": fk.get('name'),
                        "sourceTable": fqn,
                        "sourceColumns": fk.get('constrained_columns'),
                        "targetTable": target_fqn,
                        "targetColumns": fk.get('referred_columns')
                    })
                
                table_entity = {
                    "fullyQualifiedName": fqn,
                    "schemaName": schema_name or 'default',
                    "tableName": table_name,
                    "columns": columns,
                    "primaryKey": primary_key,
                    "foreignKeyRelationships": fks,
                    "comment": inspector.get_table_comment(table_name, schema=schema_name).get('text')
                }
                data_estate[fqn] = table_entity
        
        return {"tables": data_estate}

    except Exception as e:
        logger.error(f"Failed to extract data estate schema: {e}", exc_info=True)
        # Wrap in a service error for consistent handling
        raise DatabaseServiceError(f"Failed to extract data estate schema: {e}", 500)


@router.post("/data-estate-schema", response_model=models.DataEstateSchemaResponse, tags=["Data Estate"])
async def get_data_estate_schema(params: models.DBParams, settings: Settings = Depends(get_settings)):
    """
    Extracts a complete and detailed schema of the entire database.
    
    The response is structured as a collection of entities and relationships,
    making it ideal for building a knowledge graph of your data estate. It includes:
    - All tables with fully qualified names.
    - Detailed column attributes (data type, nullable, default value, etc.).
    - Primary key constraints.
    - Foreign key relationships that explicitly link tables.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        
        # In a production async application, this synchronous, IO-bound call
        # should be run in a thread pool to avoid blocking the event loop.
        # e.g., using: `asyncio.to_thread(_extract_data_estate_sync, conn_str)`
        schema_dict = _extract_data_estate_sync(conn_str)
        
        # The model_validate method will parse and validate the entire nested dictionary
        return models.DataEstateSchemaResponse.model_validate(schema_dict)

    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error extracting data estate schema: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")
    


# --- HTML Templating (for the final visualization) ---
def create_interactive_graph_html(nodes_json: str, edges_json: str, groups_json: str) -> str:
    """Generates the final, self-contained HTML page for the interactive knowledge graph."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>Semantic Data Estate Knowledge Graph</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
            :root {{
                --bg: #0D1117;
                --ink: #c9d1d9;
                --muted: #8b949e;
                --ring: #30363d;
                --brand: #1f6feb;
                --shadow: 0 8px 24px rgba(0,0,0,0.4);
            }}

            html, body {{
                margin: 0;
                padding: 0;
                background: var(--bg);
                color: var(--ink);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                font-size: clamp(14px, 1.1vw, 16px);
                height: 100%;
                overflow: hidden;
            }}

            #mynetwork {{
                width: 100vw;
                height: 100vh;
                background-color: var(--bg);
            }}

            .overlay {{
                position: fixed;
                top: 12px;
                left: 12px;
                display: flex;
                gap: 8px;
                align-items: center;
                z-index: 10;
                color: var(--ink);
                background: rgba(13,17,23,0.6);
                border: 1px solid var(--ring);
                border-radius: 8px;
                padding: 8px 10px;
                box-shadow: var(--shadow);
                backdrop-filter: blur(4px);
            }}
            .overlay .btn {{
                appearance: none;
                border: 1px solid var(--ring);
                background: #161b22;
                color: var(--ink);
                padding: 6px 10px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
            }}
            .overlay .btn:hover {{
                border-color: var(--brand);
                color: var(--ink);
            }}
            .overlay .status {{
                font-size: 12px;
                color: var(--muted);
            }}

            .vis-tooltip {{
                background-color: #21262d !important;
                color: #c9d1d9 !important;
                border: 1px solid #30363d !important;
                border-radius: 6px;
                padding: 10px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                max-width: 400px;
                white-space: pre-wrap;
            }}
        </style>
    </head>
    <body>
        <div class="overlay" aria-live="polite" aria-atomic="true">
            <button class="btn" id="fitBtn" title="Fit graph">Fit</button>
            <button class="btn" id="togglePhysicsBtn" title="Toggle physics">Physics: On</button>
            <span class="status" id="statusText">Loading library…</span>
        </div>

        <div id="mynetwork" role="application" aria-label="Interactive knowledge graph canvas"></div>

        <script>
        (function() {{
            const statusText = document.getElementById('statusText');

            // Robust script loader with fallback CDN
            function loadScript(src) {{
                return new Promise((resolve, reject) => {{
                    const s = document.createElement('script');
                    s.src = src;
                    s.async = true;
                    s.crossOrigin = 'anonymous';
                    s.referrerPolicy = 'no-referrer';
                    s.onload = () => resolve();
                    s.onerror = (e) => reject(e);
                    document.head.appendChild(s);
                }});
            }}

            async function ensureVisNetwork() {{
                if (window.vis && window.vis.Network) return true;
                try {{
                    // Primary CDN (cdnjs)
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/vis-network.min.js');
                }} catch (e) {{
                    // Fallback CDN (jsDelivr)
                    await loadScript('https://cdn.jsdelivr.net/npm/vis-network@9.1.2/dist/vis-network.min.js');
                }}
                return !!(window.vis && window.vis.Network);
            }}

            function createNetwork() {{
                const container = document.getElementById('mynetwork');
                const nodes = new vis.DataSet({nodes_json});
                const edges = new vis.DataSet({edges_json});
                const data = {{ nodes, edges }};

                const options = {{
                    layout: {{ improvedLayout: true }},
                    nodes: {{
                        shape: 'box',
                        borderWidth: 2,
                        color: {{
                            background: '#0f172a',
                            border: '#475569',
                            highlight: {{ background: '#0b1220', border: '#1f6feb' }}
                        }},
                        font: {{ color: '#c9d1d9', size: 16, face: 'Arial', strokeWidth: 2, strokeColor: '#0D1117' }},
                        margin: 15,
                        shapeProperties: {{ borderRadius: 6 }},
                        shadow: true
                    }},
                    edges: {{
                        width: 1.5,
                        color: {{ color: '#8b949e', highlight: '#1f6feb', hover: '#c9d1d9' }},
                        arrows: {{ to: {{ enabled: true, scaleFactor: 0.9 }} }},
                        font: {{ color: 'rgba(200,200,200,0.9)', size: 13, align: 'middle', strokeWidth: 2, strokeColor: '#0D1117' }},
                        smooth: {{ type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 }}
                    }},
                    physics: {{
                        enabled: true,
                        solver: 'barnesHut',
                        barnesHut: {{
                            gravitationalConstant: -25000,
                            springLength: 220,
                            centralGravity: 0.3,
                            avoidOverlap: 0.8,
                            damping: 0.15
                        }},
                        stabilization: {{ enabled: true, iterations: 600, updateInterval: 50, fit: true }},
                        adaptiveTimestep: true,
                        minVelocity: 0.1
                    }},
                    interaction: {{
                        hover: true,
                        hoverConnectedEdges: true,
                        tooltipDelay: 120,
                        navigationButtons: true,
                        keyboard: true,
                        multiselect: true,
                        selectable: true,
                        hideEdgesOnDrag: true,
                        zoomView: true,
                        dragView: true,
                        dragNodes: true
                    }},
                    groups: {groups_json}
                }};

                const network = new vis.Network(container, data, options);

                // Controls
                const fitBtn = document.getElementById('fitBtn');
                const togglePhysicsBtn = document.getElementById('togglePhysicsBtn');
                let physicsOn = true;

                fitBtn.addEventListener('click', () => {{
                    network.fit({{ animation: {{ duration: 500, easingFunction: 'easeInOutQuad' }} }});
                }});

                togglePhysicsBtn.addEventListener('click', () => {{
                    physicsOn = !physicsOn;
                    network.setOptions({{ physics: {{ enabled: physicsOn }} }});
                    togglePhysicsBtn.textContent = 'Physics: ' + (physicsOn ? 'On' : 'Off');
                }});

                network.on('doubleClick', (params) => {{
                    if (!params || (params.nodes && params.nodes.length === 0)) {{
                        network.fit({{ animation: {{ duration: 400 }} }});
                    }}
                }});

                network.on('stabilizationProgress', (p) => {{
                    const pct = Math.max(0, Math.min(100,
                        Math.round(((Number(p?.iterations)||0) / Math.max(1, Number(p?.total)||1)) * 100)
                    ));
                    statusText.textContent = `Stabilizing… ${{pct}}%`;
                }});

                network.on('stabilized', () => {{
                    const nodeCount = nodes.getIds().length;
                    const edgeCount = edges.getIds().length;
                    statusText.textContent = `Ready • Nodes: ${{nodeCount}} • Edges: ${{edgeCount}}`;
                }});
            }}

            (async () => {{
                const ok = await ensureVisNetwork();
                if (!ok) {{
                    statusText.textContent = 'Failed to load vis-network';
                    console.error('vis-network failed to load');
                    return;
                }}
                statusText.textContent = 'Stabilizing…';
                createNetwork();
            }})();
        }})();
        </script>
    </body>
    </html>
    """

# --- Main API Endpoint ---
@router.post("/semantic-knowledge-graph", response_class=Response)
async def generate_semantic_knowledge_graph(
    params: models.DBParams,
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    """
    Generates a complete, interactive Semantic Knowledge Graph of the data estate.

    This endpoint inspects the database, enriches the schema with a business-centric
    semantic layer via an LLM, and returns a self-contained HTML visualization
    designed for data stewards and governance experts.
    """
    try:
        # 1. Extract Technical Schema
        conn_str = _get_conn_str(params.connection_string, settings)
        # Note: In a real async app, this sync call should be wrapped to avoid blocking
        # e.g., schema_dict = await asyncio.to_thread(_extract_data_estate_sync, conn_str)
        schema_dict = _extract_data_estate_sync(conn_str)
        tables = schema_dict.get("tables", {})
        if not tables:
            raise HTTPException(status_code=404, detail="No tables found in the specified database.")

        # 2. Add Semantic Layer via LLM Service
        table_names = [details['tableName'] for details in tables.values()]
        
        system_prompt = """
        You are an expert data architect. Your task is to analyze a list of database table names
        and classify each one into a high-level, intuitive business domain. This classification
        is for a semantic model used by data governance experts. Use clear, business-friendly
        domain names like "Sales & Orders", "Product Management", "Supply Chain", "Customer Relations", etc.
        Your output MUST be a single, valid JSON object and nothing else.
        """
        user_prompt = f"Here are the table names to classify: {json.dumps(table_names)}"

        response_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        
        # Safely parse the LLM response
        table_groups = json.loads(response_str)
        for table in table_names:
            if table not in table_groups:
                table_groups[table] = "General"

        # 3. Define Visuals for Semantic Groups (This part is correct)
        domain_names = sorted(list(set(table_groups.values())))
        colors = ['#E91E63', '#03A9F4', '#FF9800', '#4CAF50', '#9C27B0', '#F44336', '#00BCD4']
        group_styles = {name: {
            'color': {'background': colors[i % len(colors)], 'border': colors[i % len(colors)], 'highlight': {'background': colors[i % len(colors)], 'border': '#FFFFFF'}},
            'shadow': {'enabled': True, 'color': colors[i % len(colors)], 'size': 15}
        } for i, name in enumerate(domain_names)}

        # 4. Transform Data for Visualization
        nodes_list, edges_list = [], []
        for fqn, details in tables.items():
            comment = f"<b>Description:</b> {details['comment']}\\n" if details.get('comment') else ''
            
            # =================================================================
            # === THE FIX IS ON THIS LINE =====================================
            # =================================================================
            # BEFORE (Crashing): cols_html = "\\n".join([f" - {c['name']} ({str(c['type'])})" for c in details['columns'][:10]])
            # AFTER (Corrected):
            cols_html = "\\n".join([f" - {c['columnName']} ({str(c['dataType'])})" for c in details['columns'][:10]])
            # =================================================================
            
            tooltip = f"<b>{fqn}</b>\\n{comment}<b>Columns ({len(details['columns'])}):</b>\\n{cols_html}"
            pk_label = f"\\n(PK: {', '.join(details['primaryKey']['constrainedColumns'])})" if details.get('primaryKey') else ""

            nodes_list.append({
                "id": fqn, "label": f"{details['tableName']}{pk_label}",
                "group": table_groups.get(details['tableName']),
                "title": tooltip.replace('"', '&quot;')
            })
            for rel in details.get("foreignKeyRelationships", []):
                target_fqn = f"{rel.get('targetTable')}" # Use the correct key from your schema
                edges_list.append({"from": fqn, "to": target_fqn, "label": ', '.join(rel['sourceColumns'])})
        
        # 5. Generate Final HTML
        html_content = create_interactive_graph_html( # Your existing HTML templating function
            json.dumps(nodes_list), json.dumps(edges_list), json.dumps(group_styles)
        )
        return Response(content=html_content, media_type="text/html")

    except (ValidationError, json.JSONDecodeError) as e:
        logger.error(f"AI agent returned invalid format: {e}. Raw response: {locals().get('response_str', 'N/A')}")
        raise HTTPException(status_code=502, detail=f"AI agent returned invalid format: {e}")
    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error during semantic graph generation: {e}")
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")