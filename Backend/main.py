# Backend/main.py

import os
import base64
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Response
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# --- Import All Custom Modules ---

# 1. Pydantic models for API data validation
from models import (
    TextRequestBody,
    ChatRequestBody,
    ChatResponse,
    GraphGenerationResponse
)

# 2. The new, robust graph generation and insight-finding functions
from knowledge_graph import (
    process_text_in_chunks,
    find_insightful_paths
)

# 3. The improved RAG chat agent
from chat_agent import answer_entegris_question

# 4. Helper function for file uploads
from utils import get_text_from_upload

# 5. The function that creates the advanced, interactive HTML visualization
from graph_template import create_graph_html


# Load environment variables from your .env file
load_dotenv()

# Initialize the FastAPI application
app = FastAPI(
    title="Entegris AI Research Agent API",
    description="API for generating and downloading advanced knowledge graphs and powering a RAG agent.",
    version="3.1.0", # Version bump for final CORS handling
)

# --- Add CORS Middleware ---
# Allows your React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://supreme-space-waffle-qj6wq4gpgp63x6j6-5173.app.github.dev",
        "https://*.github.dev" # Handles GitHub Codespaces and other dynamic URLs
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SOLUTION: Add a Catch-all OPTIONS Route ---
# This route intercepts all preflight OPTIONS requests from the browser.
# It returns a simple 200 OK response, which satisfies the browser and cleans up the logs.
# The CORSMiddleware still runs on top of this to add the necessary `Access-Control-*` headers.
@app.options("/{path:path}")
async def catch_all_options(path: str) -> Response:
    return Response(status_code=200)


@app.on_event("startup")
async def startup_event():
    """On startup, check that the essential API key is available."""
    if not os.getenv("GROQ_API_KEY"):
        raise RuntimeError("FATAL ERROR: GROQ_API_KEY environment variable is not set.")

# --- API Endpoints ---

@app.get("/", summary="Health Check", tags=["Status"])
async def health_check():
    """A simple endpoint to confirm that the API is running correctly."""
    return {"status": "ok", "message": "Entegris AI Agent API is active."}

@app.post(
    "/api/graph/from-file",
    response_model=GraphGenerationResponse,
    tags=["Knowledge Graph"]
)
async def create_kg_from_file(file: UploadFile = File(...)):
    """
    Accepts a file, generates an advanced knowledge graph, finds an insightful path,
    and returns a payload with both the HTML content and a data URL for downloading.
    """
    try:
        # 1. Extract text from the uploaded file
        text_content = await get_text_from_upload(file)

        # 2. Generate the graph data using our robust, chunking-based method
        graph_data = await process_text_in_chunks(text_content)

        # 3. Analyze the graph to find an interesting path to highlight
        insight = find_insightful_paths(graph_data)

        # 4. Create the complete, interactive HTML visualization
        html_content = create_graph_html(graph_data, insight)

        # 5. Encode the HTML for the download link
        b64_html = base64.b64encode(html_content.encode('utf-8')).decode('utf-8')
        download_url = f"data:text/html;base64,{b64_html}"

        # 6. Return the final payload to the frontend
        return GraphGenerationResponse(html_content=html_content, download_url=download_url)

    except Exception as e:
        print(f"ERROR in /api/graph/from-file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(
    "/api/graph/from-conversation",
    response_model=GraphGenerationResponse,
    tags=["Knowledge Graph"]
)
async def create_kg_from_conversation(body: TextRequestBody):
    """
    Accepts conversation text, generates a graph, finds an insightful path,
    and returns a payload with the HTML content and a download URL.
    """
    try:
        # The logic is identical to the file-based endpoint
        graph_data = await process_text_in_chunks(body.text)
        insight = find_insightful_paths(graph_data)
        html_content = create_graph_html(graph_data, insight)
        b64_html = base64.b64encode(html_content.encode('utf-8')).decode('utf-8')
        download_url = f"data:text/html;base64,{b64_html}"
        return GraphGenerationResponse(html_content=html_content, download_url=download_url)
    except Exception as e:
        print(f"ERROR in /api/graph/from-conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post(
    "/api/chat",
    response_model=ChatResponse,
    tags=["Chat Agent"]
)
async def chat_with_agent(body: ChatRequestBody):
    """
    Accepts a user query, performs a web search, and returns an AI answer with sources.
    """
    try:
        return await answer_entegris_question(body.query)
    except Exception as e:
        print(f"ERROR in /api/chat: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred in the chat agent: {str(e)}"
        )