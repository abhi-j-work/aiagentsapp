# Backend/main.py

import os
import base64
import json
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware

# --- Import All Custom Modules (Cleaned and Organized) ---

# 1. Pydantic models for data validation
from models import (
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