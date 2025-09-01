import os
import io
import asyncio
import traceback
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import the powerful engine you provided
from .graph_generator import (
    extract_graph_data_llm_only,
    generate_graph_from_pdf_bytes,
    extract_exceptional_insight,
    generate_experiment_for_path,
    SimpleGraphDocument
)

# --- Pydantic Models for API Validation and Documentation ---
class GenerateTextRequest(BaseModel):
    text: str = Field(..., min_length=10)

class ExperimentRequest(BaseModel):
    path_nodes: List[str]
    context_text: Optional[str] = None

# A unified response model for both generation endpoints
class GenerationResponse(BaseModel):
    graph: SimpleGraphDocument
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
    try:
        graph_doc = await extract_graph_data_llm_only(request.text)
        insight = await extract_exceptional_insight(graph_doc, context_text=request.text)
        return {"graph": graph_doc, "insight": insight}
    except Exception as e:
        print(f"Error in /api/generate/text: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate/file", response_model=GenerationResponse, tags=["Knowledge Graph"])
async def generate_from_file(file: UploadFile = File(...)):
    """
    Generates a graph from an uploaded PDF or TXT file.
    """
    try:
        file_bytes = await file.read()
        filename = file.filename or ""
        text_content = ""
        graph_document = None

        if filename.lower().endswith(".pdf"):
            from pypdf import PdfReader
            text_content = "\n\n".join([p.extract_text() or "" for p in PdfReader(io.BytesIO(file_bytes)).pages])
            # The core PDF function is sync, so we run it in a thread
            graph_document = await asyncio.to_thread(generate_graph_from_pdf_bytes, file_bytes)
        elif filename.lower().endswith(".txt"):
            text_content = file_bytes.decode("utf-8", errors="ignore")
            graph_document = await extract_graph_data_llm_only(text_content)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload a PDF or TXT file.")
        
        insight = await extract_exceptional_insight(graph_document, context_text=text_content)
        return {"graph": graph_document, "insight": insight}
    except Exception as e:
        print(f"Error in /api/generate/file: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/experiment", response_model=Dict[str, Any], tags=["Analysis"])
async def get_experiment(request: ExperimentRequest):
    """
    Generates a suggested experiment for a given path.
    """
    try:
        return await generate_experiment_for_path(request.path_nodes, request.context_text)
    except Exception as e:
        print(f"Error in /api/experiment: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))