# In file: app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.config import get_settings # type: ignore
from app.core.logging_config import setup_logging # type: ignore
from app.services import llm_service # type: ignore
from app.api.routers import data_governance, data_quality,talktoDb # type: ignore
from fastapi.middleware.cors import CORSMiddleware
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code to run on startup
    setup_logging()
    settings = get_settings()
    llm_service.initialize_groq_client(settings)
    yield
    # Code to run on shutdown (if any)

app = FastAPI(
    title="DATA_AI API",
    description="API for the Data Governance AI Agent.",
    version="1.0.0",
    lifespan=lifespan
)
origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(data_governance.router)
app.include_router(talktoDb.router) 
app.include_router(data_quality.router) 

@app.get("/")
def read_root():
    return {"message": "Welcome to the DATA_AI API"}