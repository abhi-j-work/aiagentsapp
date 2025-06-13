# In file: app/services/llm_service.py
import logging
from typing import Dict, Any, Optional
from groq import Groq, APIConnectionError, RateLimitError, APIStatusError
from app.core.config import Settings
from app.services.errors import LLMServiceError

logger = logging.getLogger(__name__)
groq_client: Optional[Groq] = None
model_name: str = "gemma2-9b-it"

def initialize_groq_client(settings: Settings):
    """Initializes the Groq client singleton from server settings."""
    global groq_client, model_name
    if not settings.GROQ_API_KEY:
        logger.error("GROQ_API_KEY is not set. LLM calls will fail.")
    else:
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
        model_name = settings.MODEL
        logger.info(f"Groq client initialized successfully for model: {model_name}")

async def call_llm(system_prompt: str, user_prompt: str, response_format: Optional[Dict[str, Any]] = None) -> str:
    """Calls the Groq API with the provided prompts."""
    if groq_client is None:
        raise LLMServiceError("Groq client not initialized.", 503)
    
    try:
        # ### FIX: Correctly uses the response_format dict passed from the router.
        response = groq_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format=response_format,
            temperature=0.0,
        )
        content = response.choices[0].message.content
        return content.strip() if content else ""
    except APIConnectionError as e:
        raise LLMServiceError(f"Groq API connection failed: {str(e)}", 503)
    except RateLimitError as e:
        raise LLMServiceError("Groq API rate limit exceeded", 429)
    except APIStatusError as e:
        raise LLMServiceError(f"Groq API error: {e.status_code} - {e.response.text}", e.status_code)