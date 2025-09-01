import os
import io
import asyncio
import traceback
import hashlib
import json
from dataclasses import asdict
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import the powerful engine you provided
from .graph_generator import (
    extract_graph_data_llm_only,
    extract_exceptional_insight,
    generate_experiment_for_path,
    SimpleGraphDocument
)
from .pdf_utils import extract_text_from_pdf
from .redis_client import redis_client

# --- Pydantic Models for API Validation and Documentation ---
class GenerateTextRequest(BaseModel):
    text: str = Field(..., min_length=10)

class ExperimentRequest(BaseModel):
    path_nodes: List[str]
    context_text: Optional[str] = None

# Pydantic models for the graph structure to be used in the response
class Node(BaseModel):
    id: str
    type: str
    size: Optional[int] = None
    color: Optional[str] = None
    font: Optional[Dict[str, Any]] = None

class Relationship(BaseModel):
    source: str
    target: str
    type: str
    label: str

class Graph(BaseModel):
    nodes: List[Node]
    relationships: List[Relationship]

# A unified response model for both generation endpoints
class GenerationResponse(BaseModel):
    graph: Graph
    insight: Dict[str, Any]

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Entegris Research Agent API",
    description="API for the Knowledge Graph extraction engine.",
    version="1.1.0"
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173","https://refactored-waddle-5gq7qq9xx77397v-5173.app.github.dev"], # Add your React dev server URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---
@app.get("/", tags=["Status"])
async def root():
    return {"status": "ok", "message": "Research Agent API is running"}

@app.post("/api/generate/text", response_model=GenerationResponse, tags=["Knowledge Graph"])
async def generate_from_text(request: GenerateTextRequest):
    """
    Generates a graph from raw text and extracts an initial insight.
    """
    if redis_client:
        cache_key = f"graph-text:{hashlib.sha256(request.text.encode()).hexdigest()}"
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)

    try:
        graph_doc = await extract_graph_data_llm_only(request.text)
        insight = await extract_exceptional_insight(graph_doc, context_text=request.text)
        result = {"graph": asdict(graph_doc), "insight": insight}

        if redis_client:
            redis_client.set(cache_key, json.dumps(result), ex=3600) # Cache for 1 hour

        return result
    except Exception as e:
        print(f"Error in /api/generate/text: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate/file", response_model=GenerationResponse, tags=["Knowledge Graph"])
async def generate_from_file(file: UploadFile = File(...)):
    """
    Generates a graph from an uploaded PDF or TXT file.
    """
    file_bytes = await file.read()

    if redis_client:
        cache_key = f"graph-file:{hashlib.sha256(file_bytes).hexdigest()}"
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)

    try:
        filename = file.filename or ""
        text_content = ""

        if filename.lower().endswith(".pdf"):
            text_content = extract_text_from_pdf(file_bytes)
            if not text_content:
                raise HTTPException(status_code=500, detail="Failed to extract text from PDF.")
        elif filename.lower().endswith(".txt"):
            text_content = file_bytes.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF or TXT file.")
        
        graph_document = await extract_graph_data_llm_only(text_content)
        insight = await extract_exceptional_insight(graph_document, context_text=text_content)
        result = {"graph": asdict(graph_document), "insight": insight}

        if redis_client:
            redis_client.set(cache_key, json.dumps(result), ex=3600) # Cache for 1 hour

        return result
    except Exception as e:
        print(f"Error in /api/generate/file: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/experiment", response_model=Dict[str, Any], tags=["Analysis"])
async def get_experiment(request: ExperimentRequest):
    """
    Generates a suggested experiment for a given path.
    """
    if redis_client:
        cache_key = f"experiment:{hashlib.sha256(json.dumps(request.dict(), sort_keys=True).encode()).hexdigest()}"
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)

    try:
        result = await generate_experiment_for_path(request.path_nodes, request.context_text)

        if redis_client:
            redis_client.set(cache_key, json.dumps(result), ex=3600) # Cache for 1 hour

        return result
    except Exception as e:
        print(f"Error in /api/experiment: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))