# app/services/llm_service.py

import logging
from functools import wraps
from typing import Dict, Any, Optional

from groq import Groq, APIConnectionError, RateLimitError, APIStatusError
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline

from app.core.config import Settings
from app.services.errors import LLMServiceError
from app.core.langfuse_utils import get_langfuse_client

logger = logging.getLogger(__name__)

# --- Globals for holding client/model instances ---
groq_client: Optional[Groq] = None
# ✅ CORRECTED: Restored your original model name as the default.
# This value will be overridden by your settings file anyway.
model_name: str = "meta-llama/llama-4-maverick-17b-128e-instruct"
local_model = None
local_tokenizer = None
local_pipeline = None


def langfuse_trace(name: str):
    """
    Decorator that instruments LLM calls with Langfuse.
    - Prefers v3 context managers (start_as_current_generation) for proper nesting & timing.
    - Falls back to legacy v2 generation(...) events if v3 APIs are not available.
    - Never alters core LLM logic or control flow.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(self, system_prompt: str, user_prompt: str, *args, **kwargs):
            langfuse = get_langfuse_client()
            # If observability is not configured, run without tracing
            if not langfuse:
                return await func(self, system_prompt, user_prompt, *args, **kwargs)

            # Resolve model name for observability only (no behavior change)
            model_in_use = "local_model" if local_pipeline else model_name
            meta = kwargs.get("metadata", {})

            # v3 preferred path: context-managed generation for nesting & timing
            start_gen = getattr(langfuse, "start_as_current_generation", None)
            update_curr_gen = getattr(langfuse, "update_current_generation", None)

            if callable(start_gen):
                try:
                    with start_gen(
                        name=name,
                        model=model_in_use,
                        input={"system": system_prompt, "user": user_prompt},
                        metadata=meta,
                    ) as generation:
                        result = await func(self, system_prompt, user_prompt, *args, **kwargs)
                        # Record output and leave duration to the context manager
                        try:
                            generation.update(output=result)
                        except Exception:
                            # Telemetry should never break app flow
                            pass
                        return result
                except Exception as e:
                    # Best-effort: annotate current generation with error details
                    if callable(update_curr_gen):
                        try:
                            update_curr_gen(
                                level="ERROR",
                                status_message=str(e),
                                output={"error": str(e)},
                                metadata=meta or None,
                            )
                        except Exception:
                            pass
                    # Re-raise original error to preserve behavior
                    raise

            # v2 fallback: emit post-hoc generation events
            gen_fn = getattr(langfuse, "generation", None)
            try:
                result = await func(self, system_prompt, user_prompt, *args, **kwargs)
                if callable(gen_fn):
                    try:
                        gen_fn(
                            name=name,
                            input={"system": system_prompt, "user": user_prompt},
                            output=result,
                            model=model_in_use,
                            metadata=meta,
                        )
                    except Exception:
                        pass
                return result
            except Exception as e:
                if callable(gen_fn):
                    try:
                        gen_fn(
                            name=name,
                            input={"system": system_prompt, "user": user_prompt},
                            output={"error": str(e)},
                            model=model_in_use,
                            metadata=meta,
                            level="ERROR",
                            status_message=str(e),
                        )
                    except Exception:
                        pass
                raise
        return wrapper
    return decorator


def initialize_groq_client(settings: Settings):
    """Initializes the Groq client singleton from application settings."""
    global groq_client, model_name
    if not settings.GROQ_API_KEY:
        logger.error("GROQ_API_KEY is not set. Cloud LLM calls will fail.")
    else:
        groq_client = Groq(api_key=settings.GROQ_API_KEY)
        # This line ensures that whatever model you define in your settings is used.
        model_name = settings.MODEL
        logger.info(f"Groq client initialized successfully for model: {model_name}")


def reload_model(model_path: str):
    """Loads a local Hugging Face model for inference."""
    global local_model, local_tokenizer, local_pipeline
    try:
        logger.info(f"Loading local model from: {model_path}")
        local_model = AutoModelForSeq2SeqLM.from_pretrained(model_path)
        local_tokenizer = AutoTokenizer.from_pretrained(model_path)
        local_pipeline = pipeline("text2text-generation", model=local_model, tokenizer=local_tokenizer)
        logger.info("Local model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load local model: {e}", exc_info=True)
        local_pipeline = None


class LLMService:
    """A service class to abstract LLM interactions, compatible with multiple agents."""

    @langfuse_trace(name="llm-generation")
    async def call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[Dict[str, Any]] = None
    ) -> str:
        """Standard method for calling the LLM, used by various agents."""
        if local_pipeline:
            try:
                full_prompt = f"{system_prompt}\n\n{user_prompt}"
                result = local_pipeline(full_prompt, max_length=1024)
                return result[0]['generated_text']
            except Exception as e:
                raise LLMServiceError(f"Local LLM inference failed: {str(e)}", 500)

        if groq_client is None:
            raise LLMServiceError("Groq client not initialized and no local model loaded.", 503)

        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
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

    @langfuse_trace(name="llm-as-judge-evaluation")
    async def call_llm_as_judge(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> str:
        """A dedicated method for calling the LLM for evaluation tasks (judging)."""
        if groq_client is None:
            raise LLMServiceError("Groq client not initialized and no local model loaded.", 503)
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            return content.strip() if content else ""
        except (APIConnectionError, RateLimitError, APIStatusError) as e:
            raise LLMServiceError(f"Groq API error during judging: {str(e)}", getattr(e, 'status_code', 500))


def get_llm_service():
    """Dependency injector for the LLMService, used by FastAPI."""
    return LLMService()
