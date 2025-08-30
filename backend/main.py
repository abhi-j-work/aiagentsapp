import re
import json
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Internal logic imports
from logic.text_extraction import read_pdf, clean_text
from logic.graph_generation import (
    generate_knowledge_graph_with_doc,
    extract_exceptional_insight,
    generate_experiment_for_path,
)

# --- Pydantic Models for API data structure ---

class Node(BaseModel):
    id: str
    label: str
    group: Optional[str] = None
    title: Optional[str] = None
    size: Optional[int] = None
    font: Optional[Dict[str, Any]] = None
    color: Optional[Dict[str, Any]] = None

class Edge(BaseModel):
    source: str
    target: str
    label: Optional[str] = None

class GraphData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

class Insight(BaseModel):
    found: bool
    explanation: Optional[str] = None
    paths: Optional[List[str]] = None
    causal_candidates: Optional[List[bool]] = None

class GraphResponse(BaseModel):
    graph: GraphData
    insight: Insight
    raw_text: str

class ExperimentRequest(BaseModel):
    path: str
    context: str

class ExperimentResponse(BaseModel):
    prompt: Optional[str] = None
    llm_response: Optional[str] = None
    parsed_json: Optional[Dict[str, Any]] = None
    trace_url: Optional[str] = None
    error: Optional[str] = None


# --- FastAPI App Initialization ---

app = FastAPI(
    title="Entegris Research Agent Backend",
    description="API for generating knowledge graphs and experiments from scientific documents.",
    version="1.0.0",
)

# Allow CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Vite's default dev port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Helper Function ---

def convert_pyvis_to_json(net) -> GraphData:
    """Converts a pyvis Network object to our Pydantic GraphData model."""
    nodes = [Node(**n) for n in net.nodes]
    edges = [Edge(source=e["from"], target=e["to"], label=e.get("label")) for e in net.edges]
    return GraphData(nodes=nodes, edges=edges)


# --- API Endpoints ---

@app.get("/", tags=["Health Check"])
def read_root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Welcome to the Research Agent Backend"}

@app.post("/api/generate-graph-from-text", response_model=GraphResponse, tags=["Graph Generation"])
async def generate_graph_from_text(text_input: str = Form(...)):
    """
    Generates a knowledge graph from raw text input.
    """
    if not text_input:
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")

    cleaned = clean_text(text_input)

    try:
        net, merged_doc = generate_knowledge_graph_with_doc(cleaned)
        graph_data = convert_pyvis_to_json(net)
        insight_data = extract_exceptional_insight(merged_doc)

        return GraphResponse(
            graph=graph_data,
            insight=insight_data,
            raw_text=cleaned
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate graph: {e}")

@app.post("/api/generate-graph-from-file", response_model=GraphResponse, tags=["Graph Generation"])
async def generate_graph_from_file(file: UploadFile = File(...)):
    """
    Generates a knowledge graph from an uploaded .txt or .pdf file.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    filename = file.filename.lower()
    raw_text = ""

    try:
        contents = await file.read()
        if filename.endswith(".pdf"):
            raw_text = read_pdf(contents)
        elif filename.endswith(".txt"):
            raw_text = contents.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload .txt or .pdf")

        cleaned = clean_text(raw_text)
        net, merged_doc = generate_knowledge_graph_with_doc(cleaned) # or from_pdf_bytes
        graph_data = convert_pyvis_to_json(net)
        insight_data = extract_exceptional_insight(merged_doc)

        return GraphResponse(
            graph=graph_data,
            insight=insight_data,
            raw_text=cleaned
        )
    except Exception as e:
        await file.close()
        raise HTTPException(status_code=500, detail=f"Failed to process file: {e}")
    finally:
        await file.close()

@app.post("/api/design-experiment", response_model=ExperimentResponse, tags=["Experiment Design"])
async def design_experiment(request: ExperimentRequest):
    """
    Designs an experiment based on a discovered path in the graph.
    """
    if not request.path:
        raise HTTPException(status_code=400, detail="Path cannot be empty.")

    try:
        # Split path string into a list of node labels
        path_nodes = [p.strip() for p in re.split(r"\s*→\s*|\s*->\s*|\s*-\s*", request.path) if p.strip()]

        # Call the mock generation logic
        experiment_data = generate_experiment_for_path(path_nodes, merged_doc_text=request.context)

        return ExperimentResponse(**experiment_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to design experiment: {e}")

# To run the server:
# uvicorn main:app --reload --port 8000
