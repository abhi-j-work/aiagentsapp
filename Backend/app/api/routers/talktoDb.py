# File: app/api/routers/talktoDb.py

import logging
import re # Import the regular expressions module
from fastapi import APIRouter, Depends, HTTPException
from pydantic import PostgresDsn, ValidationError

# Import all necessary services and models
from app.api import models as schemas
from app.services import llm_service, talktoDbservice, evaluation_service
from app.services.errors import DatabaseServiceError, LLMServiceError

# Get the same logger instance for consistent logging
logger = logging.getLogger(__name__)

# Create the router with a specific prefix and tag for API documentation
router = APIRouter(
    prefix="/talk-to-db",
    tags=["Talk to Database"]
)

@router.post(
    "/query",
    response_model=schemas.NaturalLanguageQueryResponse,
    summary="Generates and executes a secure, read-only SQL query from natural language."
)
async def generate_and_run_sql(
    request: schemas.NaturalLanguageQueryRequest,
    talktoDbservice: talktoDbservice.DatabaseService = Depends(talktoDbservice.get_db_service),
    llm_service: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    """
    This endpoint provides a complete, end-to-end flow for safely converting a natural
    language question into an executable SQL query.

    - **Step 1:** Validates the connection string.
    - **Step 2:** Introspects the database to get an accurate schema.
    - **Step 3:** Constructs a detailed system prompt for the LLM.
    - **Step 4:** Calls the LLM and cleans the raw output to extract a pure SQL query.
    - **Step 5:** Performs security checks to ensure the query is read-only.
    - **Step 6:** Evaluates the generated query using an LLM Judge.
    - **Step 7:** Executes the safe query and returns the result with the evaluation.
    """
    
    # --- Step 1: Manually Validate Connection String ---
    try:
        validated_dsn = PostgresDsn(request.connection_string)
        conn_str = str(validated_dsn)
    except ValidationError:
        raise HTTPException(
            status_code=400,
            detail="Invalid PostgreSQL connection string format."
        )

    try:
        # Step 2: Get schema and build prompt
        schema_representation = talktoDbservice.get_schema_representation(conn_str=conn_str)
        system_prompt = f"""
        You are a senior PostgreSQL database engineer. Your primary objective is to convert a user's question into a single, syntactically perfect, read-only SELECT query.
        ---
        ### CRITICAL RULES
        1.  **READ-ONLY:** You MUST ONLY generate `SELECT` statements. You are forbidden from generating queries that alter data (`UPDATE`, `INSERT`, `DELETE`) or the schema (`DROP`, `ALTER`, `CREATE`).
        2.  **OUTPUT FORMAT:** Your ONLY output must be the raw SQL query. Do NOT include explanations or markdown formatting like ```sql.
        3.  **IDENTIFIER QUOTING:** Every identifier (tables, columns, schemas, aliases) MUST be enclosed in double quotes ("").
        4.  **SCHEMA ADHERENCE:** You MUST use the provided database schema as your only source of truth.
        ---
        ### DATABASE SCHEMA
        {schema_representation}
        ---
        """
        user_prompt = request.prompt
        logger.info(f"Generating SQL for prompt: '{user_prompt}'")

        # Step 3: Generate the raw output from the LLM
        raw_llm_output = await llm_service.call_llm(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )
        logger.info(f"LLM raw output: {raw_llm_output}")

        # Step 4: Clean and extract the pure SQL from the LLM's response
        # This regex robustly finds the SELECT statement, ignoring potential markdown wrappers.
        sql_match = re.search(r"(SELECT\s+.*)", raw_llm_output, re.IGNORECASE | re.DOTALL)
        
        if not sql_match:
            logger.error(f"Failed to extract a valid SQL query from LLM output: {raw_llm_output}")
            raise LLMServiceError(
                message="The AI failed to generate a valid SQL query. Please try rephrasing your question.",
                status_code=502 # Bad Gateway
            )
            
        generated_sql = sql_match.group(1).strip()
        # Remove trailing semicolon if it exists
        if generated_sql.endswith(';'):
            generated_sql = generated_sql[:-1]
            
        logger.info(f"Cleaned and extracted SQL: {generated_sql[:200]}...")
        
        # Step 5: Security Scan on the cleaned SQL
        if not generated_sql.lower().startswith("select"):
            logger.warning(f"SECURITY: Blocked a non-SELECT query after cleaning: {generated_sql}")
            raise HTTPException(status_code=403, detail="Query blocked. Only SELECT statements are allowed.")
        
        forbidden_keywords = r"\b(delete|update|drop|truncate|alter|insert|grant|revoke|create|commit|rollback)\b"
        if re.search(forbidden_keywords, generated_sql.lower()):
            logger.warning(f"SECURITY: Blocked a query with forbidden keywords: {generated_sql}")
            raise HTTPException(status_code=403, detail="Query blocked due to potentially destructive keywords.")
        
        logger.info("Security scan passed. Query is read-only.")
        
        # Step 6: Evaluate the safe SQL with the LLM Judge.
        logger.info("Evaluating generated SQL with LLM Judge...")
        evaluation_result = await evaluation_service.judge_talk_to_db_sql(
            prompt=request.prompt,
            generated_sql=generated_sql,
            db_schema=schema_representation
        )

        # Step 7: Execute the generated query.
        execution_result = talktoDbservice.execute_query(
            conn_str=conn_str,
            sql_query=generated_sql
        )

        # Step 8: Combine all results into the final response model.
        return schemas.NaturalLanguageQueryResponse(
            generated_sql=generated_sql,
            evaluation=evaluation_result,
            **execution_result
        )

    except (DatabaseServiceError, LLMServiceError) as e:
        logger.error(f"A service error occurred: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"An unexpected internal error occurred: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected internal server error occurred.")