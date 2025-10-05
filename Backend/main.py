# Backend/main.py

import os
import base64
import json
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
# add to top imports in Backend/main.py (near other custom imports)
from chat_agent import text_to_cypher_and_run
from neo4j.graph import Node, Relationship

# --- Import All Custom Modules (Cleaned and Organized) ---

# 1. Pydantic models for data validation
from models import (
    Relationship,
    TextRequestBody,
    ChatRequestBody,
    ChatResponse,
    GraphGenerationResponse,
    ExperimentRequestBody,
    ExperimentResponse
)

# 2. Core graph logic: generation, insight-finding, and JSON parsing
from knowledge_graph import (
    process_text_in_chunks,
    extract_exceptional_insight,
    extract_json_from_text # <-- Consolidated import
)

# 3. Agentic capabilities
from chat_agent import answer_entegris_question
from graph_rag import GraphRAG
from llm_wrapper import call_llm
# from prompts import DESIGN_EXPERIMENT_PROMPT

# 4. Utility and helper modules
from utils import get_text_from_upload
from graph_template import create_graph_html
from redis_cache import cache_set, cache_get

# Load environment variables from .env file
load_dotenv()

# Initialize the FastAPI application
app = FastAPI(
    title="Entegris AI Research Agent API",
    description="API for generating knowledge graphs, designing experiments, and powering a RAG agent.",
    version="5.1.0", # Version bump for final cleanup
)

# --- Initialize Singleton RAG instance ---
# This ensures the embedding models are loaded only once on startup.
rag_system = GraphRAG()

# --- Add CORS Middleware ---
# Allows your React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.github.dev",
        "*" # Broadest setting for flexible development environments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Catch-all OPTIONS Route for Preflight Requests ---
@app.options("/{path:path}")
async def catch_all_options(path: str) -> Response:
    return Response(status_code=200)

@app.on_event("startup")
async def startup_event():
    """On startup, check that the essential API key is available."""
    if not os.getenv("GROQ_API_KEY"):
        raise RuntimeError("FATAL ERROR: GROQ_API_KEY environment variable is not set.")

# --- Core Logic Helper Function ---

async def _generate_graph_and_insight(text_content: str, document_id: str) -> dict:
    """
    Core reusable logic for generating a graph, finding insights, and indexing for RAG.
    """
    graph_data = await process_text_in_chunks(text_content)
    insight = extract_exceptional_insight(graph_data, text_content)

    try:
        rag_system.index_document_and_graph(document_id, text_content, graph_data)
        print(f"Successfully indexed document '{document_id}' for RAG.")
    except Exception as e:
        print(f"Warning: RAG indexing failed for '{document_id}': {e}")
    
    cache_set(f"doc_text:{document_id}", text_content, expire_seconds=86400) # Cache for 24 hours

    return {"graph_data": graph_data, "insight": insight}


# Add this helper function somewhere near the other helpers (minimal, local only)
_neo4j_driver = None

def get_neo4j_driver():
    global _neo4j_driver
    if _neo4j_driver is None:
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")

        if not (uri and user and password):
            return None, "Neo4j credentials not set."

        try:
            from neo4j import GraphDatabase
            _neo4j_driver = GraphDatabase.driver(uri, auth=(user, password))
            _neo4j_driver.verify_connectivity()
            print("Neo4j driver initialized and connected successfully.")
        except Exception as e:
            print(f"Failed to connect to Neo4j: {e}")
            _neo4j_driver = None
            return None, f"Failed to connect to Neo4j: {e}"
    return _neo4j_driver, None # Return driver and None for error if successful

# --- Modified run_query_if_neo4j function ---
def run_query_if_neo4j(cypher: str, parameters: dict = None):
    """
    Minimal runner: if NEO4J_URI/NEO4J_USER/NEO4J_PASSWORD are set and neo4j driver is available,
    execute the query and return list-of-dicts. Otherwise return None (caller will still get cypher).
    Now accepts an optional `parameters` dictionary to pass to the Cypher query.
    """
    driver, error_msg = get_neo4j_driver()
    if error_msg:
        # If no driver or connection error, return error dict or None as per original logic
        # For consistency with the error format, let's return a dict here
        return {"error": error_msg}


    try:
        with driver.session() as session:
            def _tx_run(tx, cypher_query, params_dict): # Modified to accept parameters
                res = tx.run(cypher_query, params_dict) # Pass parameters here
                return [r.data() for r in res]
            
            # Pass the cypher and parameters to the transaction function
            results = session.read_transaction(_tx_run, cypher, parameters)
        return results
    except Exception as e:
        print(f"Error executing cypher on Neo4j: {e}")
        return {"error": str(e)}
    # The driver close logic is removed from here because we are managing a global driver.
    # The driver should be closed gracefully when the application shuts down.
    # For a FastAPI app, you might use an `@app.on_event("shutdown")` handler.

# --- API Endpoints ---

@app.get("/", summary="Health Check", tags=["Status"])
async def health_check():
    """Confirms that the API is running."""
    return {"status": "ok", "message": "Entegris AI Agent API is active."}

# In Backend/main.py

@app.post("/api/graph/from-file", response_model=GraphGenerationResponse, tags=["Knowledge Graph"])
async def create_kg_from_file(
    file: UploadFile = File(...),
    pulse_on: bool = Query(True, alias="pulseOn"),
    pulse_amp: float = Query(6.0, alias="pulseAmp"),
    pulse_speed: float = Query(0.12, alias="pulseSpeed")
):
    """
    Accepts a file, generates a knowledge graph with insights, indexes it for RAG,
    and returns an interactive HTML visualization.
    """
    try:
        text_content = await get_text_from_upload(file)
        document_id = file.filename or "uploaded_document"
        
        result = await _generate_graph_and_insight(text_content, document_id)
        
        html_content = create_graph_html(
            graph_data=result["graph_data"], 
            insight=result["insight"],
            pulse_enabled=pulse_on, # <-- THIS IS THE FIX
            pulse_amplitude=pulse_amp,
            pulse_speed=pulse_speed
        )
        # --- END CORRECTION ---
        
        b64_html = base64.b64encode(html_content.encode('utf-8')).decode('utf-8')
        download_url = f"data:text/html;base64,{b64_html}"
        
        return GraphGenerationResponse(html_content=html_content, download_url=download_url)
        
    except Exception as e:
        print(f"ERROR in /api/graph/from-file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/graph/from-conversation", response_model=GraphGenerationResponse, tags=["Knowledge Graph"])
async def create_kg_from_conversation(body: TextRequestBody):
    """
    Accepts conversation text, generates a graph with insights, and returns visualization.
    """
    try:
        document_id = "conversation_context"
        result = await _generate_graph_and_insight(body.text, document_id)
        
        html_content = create_graph_html(
            graph_data=result["graph_data"],
            insight=result["insight"],
            pulse_enabled=True,
            pulse_amplitude=6.0,
            pulse_speed=0.12
        )
        
        b64_html = base64.b64encode(html_content.encode('utf-8')).decode('utf-8')
        download_url = f"data:text/html;base64,{b64_html}"
        
        return GraphGenerationResponse(html_content=html_content, download_url=download_url)
    except Exception as e:
        print(f"ERROR in /api/graph/from-conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/graph/design-experiment", response_model=ExperimentResponse, tags=["Agent Actions"])
async def design_experiment_for_path(body: ExperimentRequestBody):
    """
    Designs a scientific experiment based on a path from a knowledge graph,
    using the cached document and RAG for rich context.
    """
    try:
        doc_text = cache_get(f"doc_text:{body.document_id}")
        if not doc_text:
            raise HTTPException(status_code=404, detail="Source document context not found or expired. Please re-generate the graph.")

        rag_context_hits = rag_system.retrieve(query=body.path_string)
        rag_context = json.dumps(rag_context_hits, indent=2)

        prompt = DESIGN_EXPERIMENT_PROMPT.format(
            path=body.path_string,
            context=f"SOURCE DOCUMENT CONTEXT:\n{doc_text}\n\nADDITIONAL CONTEXT FROM GRAPH RAG:\n{rag_context}"
        )
        
        llm_response_str = call_llm(prompt, max_tokens=3072, temperature=0.1)
        
        parsed_json = json.loads(extract_json_from_text(llm_response_str))

        return ExperimentResponse(
            path_string=body.path_string,
            prompt=prompt,
            llm_response=llm_response_str,
            parsed_json=parsed_json
        )
    except Exception as e:
        print(f"ERROR in /api/graph/design-experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse, tags=["Chat Agent"])
async def chat_with_agent(body: ChatRequestBody):
    """
    Accepts a user query, performs a web search using a RAG pipeline, and returns an answer.
    """
    try:
        result = await answer_entegris_question(body.query)
        return ChatResponse(
            answer=result.get("answer", "No answer could be generated."),
            sources=result.get("sources", [])
        )
    except Exception as e:
        print(f"ERROR in /api/chat: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred in the chat agent: {str(e)}")
    

@app.post("/api/graph/text-to-cypher", tags=["Knowledge Graph"])
async def text_to_cypher_endpoint(body: TextRequestBody, useLLM: bool = Query(False, alias="useLLM")):
    """
    Convert natural language to a Cypher query and return a graph structure.
    """
    try:
        # This part remains the same: it generates and runs the cypher query
        out = await text_to_cypher_and_run(body.text, run_query_fn=run_query_if_neo4j, use_llm=useLLM)
        
        # *** THE MINIMAL FIX IS HERE ***
        # Instead of returning the raw results, we process them first.
        graph_data = process_neo4j_records(out.get("results", []))
        
        # We now return a standardized format that the frontend expects.
        return {
            "cypher": out.get("cypher"),
            "graph": graph_data, # Contains the clean {nodes: [], edges: []} structure
            "results": out.get("results") # Keep raw results for the JSON viewer in chat
        }

    except Exception as e:
        print(f"ERROR in /api/graph/text-to-cypher: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Helper to get node associations (MODIFIED to use node property 'id') ---
async def get_node_associations_cypher_and_run(node_id: str):
    """
    Generates a Cypher query to find all direct associations (nodes and relationships)
    for a given node ID, and executes it if Neo4j is configured.
    This version now assumes `node_id` refers to a property named 'id' on the node.
    """
    # Cypher query to find a node and all its direct relationships and connected nodes
    # IMPORTANT CHANGE: WHERE n.id = $node_id (compares against the node property 'id')
    print(node_id)
    cypher_query = """
    MATCH (n)
    WHERE n.id = $node_id
    OPTIONAL MATCH (n)-[r]-(m)
    RETURN n, collect(DISTINCT r) as relationships, collect(DISTINCT m) as associatedNodes
    """
    # cypher_query = """
    # MATCH (n)-[r]-(m)
    # WHERE n.id = $node_id
    # RETURN n, r, m
    # UNION
    # MATCH (n)
    # WHERE n.id = $node_id
    # RETURN n, NULL as r, NULL as m
    # """
    # Parameters to pass to the query runner
    params = {"node_id": node_id} # node_id can now be any string, like "MAT-0009"

    # Execute the query using the existing Neo4j runner, passing parameters
    # This requires `run_query_if_neo4j` to support a `parameters` argument.
    raw_results = run_query_if_neo4j(cypher_query, parameters=params)

    if isinstance(raw_results, dict) and "error" in raw_results:
        raise HTTPException(status_code=500, detail=raw_results["error"])

    # Process the raw results into the frontend-friendly format
    graph_data = process_neo4j_records(raw_results or [])

    return {
        "cypher": cypher_query, # Still show the parametrized query
        "parameters": params,   # Show parameters for debugging
        "results": raw_results, # Raw results for debugging if needed
        "graph": graph_data,    # Cleaned nodes/edges for frontend
    }


# --- NEW API Endpoint for Node Associations (MODIFIED - removed isdigit check) ---
@app.get("/api/graph/node-associations", tags=["Knowledge Graph"])
async def get_node_associations_endpoint(nodeId: str = Query(..., alias="nodeId")):
    """
    Fetches all direct relationships and connected nodes for a given node ID.
    This version accepts string IDs which are properties of the node (e.g., 'MAT-0009').
    """
    if not nodeId:
        raise HTTPException(status_code=400, detail="Node ID is required.")

    # IMPORTANT CHANGE: Removed the .isdigit() check.
    # The nodeId is now expected to be a string that matches a node's 'id' property.

    try:
        associations = await get_node_associations_cypher_and_run(nodeId)
        return associations
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR in /api/graph/node-associations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch node associations: {str(e)}")
    
    
# ... (Your existing `process_neo4j_records` function) ...

# def process_neo4j_records(records):
#     """
#     Processes raw Neo4j records to a D3.js friendly format.
#     It intelligently finds nodes and relationships and formats them correctly.
#     """
#     nodes = {}
#     edges = []
    
#     # Keep track of added edge IDs to prevent duplicates for bidirectional relationships
#     added_edge_ids = set() 

#     for record in records:
#         n = record.get('n')
#         r = record.get('r')
#         m = record.get('m')

#         # Add node n if not already added
#         if isinstance(n, Node):
#             node_id_n = str(n.id)
#             if node_id_n not in nodes:
#                 # Add common properties: id, labels, and all other properties
#                 nodes[node_id_n] = {
#                     "id": node_id_n,
#                     "name": n.get("name") or n.get("title") or node_id_n, # Attempt to get a display name
#                     "labels": list(n.labels),
#                     "properties": dict(n) # Store all original properties
#                 }

#         # Add node m if not already added
#         if isinstance(m, Node):
#             node_id_m = str(m.id)
#             if node_id_m not in nodes:
#                 nodes[node_id_m] = {
#                     "id": node_id_m,
#                     "name": m.get("name") or m.get("title") or node_id_m,
#                     "labels": list(m.labels),
#                     "properties": dict(m)
#                 }

#         # Add relationship if it exists
#         if isinstance(r, Relationship):
#             source_id = str(r.start_node.id)
#             target_id = str(r.end_node.id)
#             rel_type = r.type

#             # Create a canonical ID for the edge to avoid duplicates,
#             # especially for `(n)-[r]-(m)` which returns relationships in both directions
#             edge_id = f"{min(source_id, target_id)}-{rel_type}-{max(source_id, target_id)}"

#             if edge_id not in added_edge_ids:
#                 edges.append({
#                     "id": edge_id, # Frontend uses this for uniqueness
#                     "source": source_id,
#                     "target": target_id,
#                     "type": rel_type,
#                     "properties": dict(r) # Store all original relationship properties
#                 })
#                 added_edge_ids.add(edge_id)

#     return {"nodes": list(nodes.values()), "edges": edges}

def process_neo4j_records(records):
    """
    Processes raw Neo4j records to a D3.js friendly format.
    It intelligently finds nodes and relationships and formats them correctly.
    """
    nodes = {}
    edges = []

    for record in records:
        for key, value in record.items():
            # Check if the item is a Neo4j Node
            if isinstance(value, Node):
                node_id = str(value.id)
                if node_id not in nodes:
                    nodes[node_id] = {
                        "id": node_id,
                        "labels": list(value.labels),
                        **value  # Unpack all node properties
                    }
            # Check if the item is a Neo4j Relationship
            elif isinstance(value, Relationship):
                edges.append({
                    "source": str(value.start_node.id),
                    "target": str(value.end_node.id),
                    "type": value.type,
                    **value  # Unpack all relationship properties
                })

    return {"nodes": list(nodes.values()), "edges": edges}