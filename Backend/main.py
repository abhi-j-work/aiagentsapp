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
def run_query_if_neo4j(cypher: str):
    """
    Minimal runner: if NEO4J_URI/NEO4J_USER/NEO4J_PASSWORD are set and neo4j driver is available,
    execute the query and return list-of-dicts. Otherwise return None (caller will still get cypher).
    """
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER")
    password = os.getenv("NEO4J_PASSWORD")
    if not (uri and user and password):
        # No Neo4j creds -> don't attempt to execute (safe)
        return None

    try:
        # import here to avoid hard dependency unless this path is used
        from neo4j import GraphDatabase
    except Exception as e:
        # neo4j package not installed or import error -> do not break main app
        print(f"neo4j driver not available: {e}")
        return None

    driver = None
    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        with driver.session() as session:
            def _tx_run(tx):
                res = tx.run(cypher)
                return [r.data() for r in res]
            results = session.read_transaction(_tx_run)
        return results
    except Exception as e:
        print(f"Error executing cypher on Neo4j: {e}")
        return {"error": str(e)}
    finally:
        if driver:
            try:
                driver.close()
            except Exception:
                pass

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