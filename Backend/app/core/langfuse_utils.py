from langfuse import Langfuse
from functools import lru_cache
from app.core.config import Settings, get_settings

@lru_cache(maxsize=1)
def get_langfuse_client() -> Langfuse | None:
    """
    Initializes and returns a singleton instance of the Langfuse client.
    
    Reads credentials from the application settings.
    Returns None if credentials are not configured, disabling tracing.
    """
    settings: Settings = get_settings()
    
    if not all([settings.LANGFUSE_PUBLIC_KEY, settings.LANGFUSE_SECRET_KEY, settings.LANGFUSE_HOST]):
        print("⚠️ WARNING: Langfuse credentials not configured. LLM tracing will be disabled.")
        return None

    print("✅ Initializing Langfuse client for production tracing...")
    return Langfuse(
        public_key=settings.LANGFUSE_PUBLIC_KEY,
        secret_key=settings.LANGFUSE_SECRET_KEY,
        host=settings.LANGFUSE_HOST
    )