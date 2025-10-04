# app/api/routers/talktoDb.py

import logging
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import PostgresDsn, ValidationError

from app.api import models as schemas
from app.services import llm_service, talktoDbservice, evaluation_service
from app.services.errors import DatabaseServiceError, LLMServiceError
from app.core.langfuse_utils import get_langfuse_client

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/talk-to-db",
    tags=["Talk to Database"]
)

def _redact_conn_str(conn: str) -> str:
    """
    Best-effort redaction of credentials inside a Postgres DSN to avoid leaking secrets into traces.
    Examples:
      - postgresql://user:pass@host:5432/db -> postgresql://user:***@host:5432/db
    """
    return re.sub(r"(postgres(?:ql)?://[^:\s]+:)([^@]+)(@)", r"\1***\3", conn)

@router.post(
    "/query",
    response_model=schemas.NaturalLanguageQueryResponse,
    summary="Generates and executes a secure SQL query from natural language with full tracing."
)
async def generate_and_run_sql(
    request: schemas.NaturalLanguageQueryRequest,
    talktoDbservice: talktoDbservice.DatabaseService = Depends(talktoDbservice.get_db_service),
    llm: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    """
    End-to-end flow to convert a natural language question into a safe SQL query with deep tracing of each step (Langfuse v3).
    """
    langfuse = get_langfuse_client()
    if not langfuse:
        # Strict observability requirement
        raise HTTPException(status_code=503, detail="Observability service (Langfuse) is not configured.")

    # Prepare PII-safe input for the root trace
    request_input = request.dict()
    if "connection_string" in request_input and isinstance(request_input["connection_string"], str):
        request_input["connection_string"] = _redact_conn_str(request_input["connection_string"])

    # -------- v3 Root Span (Trace) --------
    # In SDK v3, use a root span and set trace attributes via update_trace(...)
    # Child spans and generations are nested via context managers.
    with langfuse.start_as_current_span(name="talk-to-db-pipeline") as root_span:
        try:
            # Set trace-level attributes up front
            root_span.update_trace(
                user_id="api-user",  # TODO: replace with authenticated subject if available
                metadata={"model": llm_service.model_name},
                tags=["production", "text2sql"],
                input=request_input,
            )

            # STEP 1: Connection string validation (local logic)
            try:
                conn_str = str(PostgresDsn(request.connection_string))
            except ValidationError as e:
                raise HTTPException(status_code=400, detail=f"Invalid PostgreSQL connection string format: {e}")

            # STEP 2: Schema introspection
            with langfuse.start_as_current_span(name="get-schema-representation") as span:
                schema_representation = talktoDbservice.get_schema_representation(conn_str=conn_str)
                try:
                    span.update(output={"schema_char_length": len(schema_representation)})
                except Exception:
                    pass

            # STEP 3: LLM SQL generation
            system_prompt = f"""
            You are a senior PostgreSQL database engineer. Your primary objective is to convert a user's question into a single, syntactically perfect, read-only SELECT query.
            ---
            ### CRITICAL RULES
            1.  **READ-ONLY:** You MUST ONLY generate `SELECT` statements. You are forbidden from generating queries that alter data (`UPDATE`, `INSERT`, `DELETE`) or the schema (`DROP`, `ALTER`, `CREATE`).
            2.  **OUTPUT FORMAT:** Your ONLY output must be the raw SQL query. Do NOT include explanations, comments, or markdown formatting like ```
            3.  **IDENTIFIER QUOTING:** Every identifier (tables, columns, schemas, aliases) MUST be enclosed in double quotes ("").
            4.  **SCHEMA ADHERENCE:** You MUST use the provided database schema as your only source of truth.
            ---
            ### DATABASE SCHEMA
            {schema_representation}
            ---
            """
            with langfuse.start_as_current_generation(
                name="generate-sql-query",
                model=llm_service.model_name,
                input={"system_prompt": system_prompt, "user_prompt": request.prompt},
            ) as gen:
                raw_llm_output = await llm.call_llm(system_prompt=system_prompt, user_prompt=request.prompt)
                try:
                    gen.update(output={"raw_llm_output": raw_llm_output})
                except Exception:
                    pass

            # STEP 4: Parse + security validation
            with langfuse.start_as_current_span(
                name="parse-and-secure-sql",
                input={"raw": raw_llm_output}
            ) as span:
                sql_match = re.search(r"SELECT\s+.*;?", raw_llm_output, re.IGNORECASE | re.DOTALL)
                if not sql_match:
                    raise LLMServiceError("AI failed to generate a valid SQL SELECT query.", status_code=502)

                generated_sql = sql_match.group(0).strip().removesuffix(';')

                forbidden_keywords = r"\b(delete|update|drop|truncate|alter|insert|grant|revoke|create|commit)\b"
                if re.search(forbidden_keywords, generated_sql.lower()):
                    try:
                        span.update(output={"status": "BLOCKED", "reason": "Forbidden keywords found"}, level="WARNING")
                    except Exception:
                        pass
                    raise HTTPException(status_code=403, detail="Query blocked by security policy: destructive keywords found.")

                try:
                    span.update(output={"status": "PASSED", "cleaned_sql": generated_sql})
                except Exception:
                    pass

            # STEP 5: LLM as judge (JSON)
            with langfuse.start_as_current_span(name="evaluate-sql-with-judge") as span:
                evaluation_result = await evaluation_service.judge_talk_to_db_sql(
                    prompt=request.prompt, generated_sql=generated_sql, db_schema=schema_representation, llm=llm
                )
                try:
                    span.update(output=evaluation_result.dict())
                except Exception:
                    pass
                try:
                    # Score the entire trace (visible on the trace)
                    root_span.score_trace(name="llm-judge-score", value=evaluation_result.score)
                except Exception:
                    pass

            # STEP 6: Execute final query
            with langfuse.start_as_current_span(
                name="execute-final-query",
                input={"sql": generated_sql}
            ) as span:
                execution_result = talktoDbservice.execute_query(conn_str=conn_str, sql_query=generated_sql)
                try:
                    span.update(output={
                        "row_count": execution_result.get("row_count"),
                        "columns": execution_result.get("columns")
                    })
                except Exception:
                    pass

            # STEP 7: Finalize trace output
            final_response = schemas.NaturalLanguageQueryResponse(
                generated_sql=generated_sql, evaluation=evaluation_result, **execution_result
            )
            try:
                root_span.update_trace(output=final_response.dict())
            except Exception:
                pass
            return final_response

        except Exception as e:
            detail = getattr(e, "message", getattr(e, "detail", str(e)))
            try:
                root_span.update_trace(level="ERROR", status_message=detail)
            except Exception:
                pass
            logger.error(f"Error in talk-to-db pipeline: {detail}", exc_info=True)
            status_code = getattr(e, "status_code", 500)
            raise HTTPException(status_code=status_code, detail=detail)
