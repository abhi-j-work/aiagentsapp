import os
import asyncio
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Assuming graph_generator.py is in the same directory
from .graph_generator import (
    extract_graph_data_llm_only,
    generate_graph_from_pdf_bytes,
    extract_exceptional_insight,
    generate_experiment_for_path,
    SimpleGraphDocument,
    SimpleNode,
    SimpleRelationship
)

# Pydantic Models for API validation and documentation
class GenerateTextRequest(BaseModel):
    text: str = Field(..., min_length=10, description="The raw text to process.")

class InsightRequest(BaseModel):
    nodes: List[SimpleNode]
    relationships: List[SimpleRelationship]
    context_text: Optional[str] = Field(None, description="Optional context text for better insight generation.")

class ExperimentRequest(BaseModel):
    path_nodes: List[str] = Field(..., description="An ordered list of node IDs representing the path.")
    context_text: Optional[str] = Field(None, description="The full text context for the document.")

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Entegris Research Agent API",
    description="API for extracting knowledge graphs from scientific documents.",
    version="1.0.0"
)

# --- CORS Middleware ---
# Allows the React frontend (running on a different port) to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Adjust if your frontend runs elsewhere
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.get("/", tags=["Status"])
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Welcome to the Research Agent API"}

@app.post("/api/generate/text", response_model=SimpleGraphDocument, tags=["Knowledge Graph"])
async def generate_from_text(request: GenerateTextRequest):
    """
    Generates a knowledge graph from a string of text.
    """
    try:
        graph_document = await extract_graph_data_llm_only(request.text)
        return graph_document
    except Exception as e:
        # Log the exception details for debugging
        print(f"Error in /api/generate/text: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate/file", response_model=SimpleGraphDocument, tags=["Knowledge Graph"])
async def generate_from_file(file: UploadFile = File(...)):
    """
    Generates a knowledge graph from an uploaded PDF file.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")

    try:
        file_bytes = await file.read()
        # This function is synchronous in the refactored code, but we can run it in a thread
        # to avoid blocking the event loop for a long time.
        graph_document = await asyncio.to_thread(generate_graph_from_pdf_bytes, file_bytes)
        return graph_document
    except Exception as e:
        print(f"Error in /api/generate/file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/insights", response_model=Dict[str, Any], tags=["Analysis"])
async def get_insights(request: InsightRequest):
    """
    Extracts exceptional insights and multi-hop paths from a given graph structure.
    """
    try:
        graph_doc = SimpleGraphDocument(nodes=request.nodes, relationships=request.relationships)
        insights = await extract_exceptional_insight(graph_doc, context_text=request.context_text)
        return insights
    except Exception as e:
        print(f"Error in /api/insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/experiment", response_model=Dict[str, Any], tags=["Analysis"])
async def get_experiment(request: ExperimentRequest):
    """
    Generates a suggested experiment for a given path in the knowledge graph.
    """
    try:
        experiment_data = await generate_experiment_for_path(request.path_nodes, request.context_text)
        return experiment_data
    except Exception as e:
        print(f"Error in /api/experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# To run this app:
# 1. Make sure you are in the `backend` directory.
# 2. Run the command: uvicorn app.main:app --reload
# The API will be available at http://127.0.0.1:8000
# The interactive documentation (Swagger UI) will be at http://127.0.0.1:8000/docs
