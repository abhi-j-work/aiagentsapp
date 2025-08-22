# In file: app/services/llm_service.py
import logging
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
from typing import Dict, Any, Optional
from groq import Groq, APIConnectionError, RateLimitError, APIStatusError
from app.core.config import Settings
from app.services.errors import LLMServiceError

logger = logging.getLogger(__name__)

# Groq client for remote inference
groq_client: Optional[Groq] = None
model_name: str = "meta-llama/llama-4-maverick-17b-128e-instruct"

# Local model for local inference
local_model = None
local_tokenizer = None
local_pipeline = None

def initialize_groq_client(settings: Settings):
    """Initializes the Groq client singleton from server settings."""
    global groq_client, model_name
    if not settings.GROQ_API_KEY:
        logger.error("GROQ_API_KEY is not set. LLM calls will fail.")
    else:
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
        model_name = settings.MODEL
        logger.info(f"Groq client initialized successfully for model: {model_name}")

def reload_model(model_path: str):
    """
    Loads a local model and tokenizer from the given path.
    """
    global local_model, local_tokenizer, local_pipeline
    try:
        logger.info(f"Loading local model from: {model_path}")
        local_model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
        local_tokenizer = AutoTokenizer.from_pretrained(model_path)
        local_pipeline = pipeline("text2text-generation", model=local_model, tokenizer=local_tokenizer)
        logger.info("Local model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load local model: {e}")
        local_model = None
        local_tokenizer = None
        local_pipeline = None

class LLMService:
    async def call_llm(self, system_prompt: str, user_prompt: str, response_format: Optional[Dict[str, Any]] = None) -> str:
        """Calls the LLM. Uses local model if available, otherwise falls back to Groq."""
        if local_pipeline:
            try:
                full_prompt = f"{system_prompt}\n\n{user_prompt}"
                result = local_pipeline(full_prompt, max_length=512)
                return result[0]['generated_text']
            except Exception as e:
                raise LLMServiceError(f"Local LLM inference failed: {str(e)}", 500)

        if groq_client is None:
            raise LLMServiceError("Groq client not initialized and no local model loaded.", 503)

        try:
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

def get_llm_service():
    return LLMService()
