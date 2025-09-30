# app/services/llm_service.py (excerpt)
import logging
from functools import wraps
from typing import Dict, Any, Optional
from groq import Groq, APIConnectionError, RateLimitError, APIStatusError
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

from app.core.config import Settings
from app.services.errors import LLMServiceError
from app.core.langfuse_utils import get_langfuse_client  # must return a v3 client (langfuse.get_client())

logger = logging.getLogger(__name__)

# Globals (as in your code)
groq_client: Optional[Groq] = None
model_name: str = "meta-llama/llama-4-maverick-17b-128e-instruct"
local_model = None
local_tokenizer = None
local_pipeline = None

def langfuse_trace(name: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(self, system_prompt: str, user_prompt: str, *args, **kwargs):
            langfuse = get_langfuse_client()
            if not langfuse:
                return await func(self, system_prompt, user_prompt, *args, **kwargs)

            model_in_use = "local_model" if local_pipeline else model_name

            # Root span defines the trace context in v3
            with langfuse.start_as_current_span(name=name) as span:
                # Set trace-level attributes
                span.update_trace(
                    user_id="data-governance-app",
                    metadata={"model": model_in_use}
                )
                # LLM generation for structured IO
                with span.start_as_current_generation(
                    name=f"{name}-generation",
                    input={"system": system_prompt, "user": user_prompt},
                    model=model_in_use,
                    metadata={"response_format": kwargs.get("response_format")}
                ) as gen:
                    try:
                        result = await func(self, system_prompt, user_prompt, *args, **kwargs)
                        gen.update(output=result)
                        return result
                    except Exception as e:
                        gen.update(level="ERROR", status_message=str(e))
                        # Optionally mark entire trace severity as well:
                        # span.update_trace(level="ERROR", status_message=str(e))
                        raise
        return wrapper
    return decorator

def initialize_groq_client(settings: Settings):
    global groq_client, model_name
    if not settings.GROQ_API_KEY:
        logger.error("GROQ_API_KEY is not set. LLM calls will fail.")
    else:
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
        model_name = settings.MODEL
        logger.info(f"Groq client initialized successfully for model: {model_name}")

def reload_model(model_path: str):
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
    @langfuse_trace(name="call-llm-service")
    async def call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[Dict[str, Any]] = None
    ) -> str:
        # Local model path
        if local_pipeline:
            try:
                full_prompt = f"{system_prompt}\n\n{user_prompt}"
                result = local_pipeline(full_prompt, max_length=512)
                return result[0]['generated_text']
            except Exception as e:
                raise LLMServiceError(f"Local LLM inference failed: {str(e)}", 500)

        # Groq path
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
        except RateLimitError:
            raise LLMServiceError("Groq API rate limit exceeded", 429)
        except APIStatusError as e:
            raise LLMServiceError(f"Groq API error: {e.status_code} - {e.response.text}", e.status_code)

def get_llm_service():
    return LLMService()
