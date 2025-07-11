# In file: app/api/routers/talktoDb.py

import logging
from fastapi import APIRouter, Depends, HTTPException

# Import the schemas (models) and services needed
from app.api import models as schemas # type: ignore
from app.services import db_service, llm_service,talktoDbservice # type: ignore
from app.services.errors import DatabaseServiceError, LLMServiceError # type: ignore

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
    summary="Generates and executes a PostgreSQL query from a natural language prompt."
)
async def generate_and_run_sql(
    request: schemas.NaturalLanguageQueryRequest,
    talktoDbservice: talktoDbservice.DatabaseService = Depends(talktoDbservice.get_db_service),
    llm_service: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    """
    This endpoint provides a complete, end-to-end flow for converting a natural
    language question into an executable SQL query.

    - **Step 1:** Introspects the database to get an accurate schema.
    - **Step 2:** Constructs a detailed system prompt for the LLM.
    - **Step 3:** Calls the LLM to generate a precise PostgreSQL query.
    - **Step 4:** Executes the query and returns the result.
    """
    try:
        # Step 1: Get the database schema representation.
        # This mirrors the logic in your other endpoints that need schema context.
        db_name = request.connection_string.path.lstrip('/') if request.connection_string.path else "N/A"
        logger.info(f"Extracting schema for database: {db_name}")

        # Now, we use your talktoDb_service instance to call the method
        schema_representation = talktoDbservice.get_schema_representation(
            conn_str=str(request.connection_string)
        )

        # Step 2: Define the System and User Prompts, keeping the logic in the endpoint.
        # In file: app/api/routers/talktoDb.py

# ... inside the generate_and_run_sql function ...

        system_prompt = f"""
        You are a senior PostgreSQL database engineer and a world-class SQL writer. Your primary objective is to convert a user's natural language question into a single, syntactically perfect, and executable PostgreSQL query.

        ---
        ### CRITICAL RULES
        You MUST follow these rules without exception.

        1.  **OUTPUT FORMAT:** Your ONLY output must be the raw SQL query. Do NOT include any explanations, comments, or markdown formatting.
        2.  **IDENTIFIER QUOTING:** Every identifier (tables, columns, schemas, aliases) MUST be enclosed in double quotes (""). **If an identifier in the provided schema is already quoted, use it as-is. DO NOT add extra quotes.**
            - Correct: `SELECT "u"."email" FROM "public"."users" AS "u"`
            - Incorrect: `SELECT u.email FROM public.users AS u`
            - Incorrect: `SELECT ""u"".""email"" FROM ""public"".""users""`
        3.  **SCHEMA ADHERENCE:** You MUST use the provided database schema as your only source of truth. Do not invent columns or tables.

        ---
        ### QUERY WRITING GUIDELINES
        (Your other guidelines about LIMIT, etc., are excellent and should remain here)
        ...

        ---
        ### FAILURE CONDITION
        (Your UNANSWERABLE rule is also excellent and should remain)
        ...

        ---
        ### DATABASE SCHEMA
        {schema_representation}
        ---
        """
        user_prompt = request.prompt
        logger.info(f"Generating SQL for prompt: '{user_prompt}'")

        # Step 3: Call the LLM service with the explicit prompts.
        generated_sql = await llm_service.call_llm(
            system_prompt=system_prompt,
            user_prompt=user_prompt
        )
        logger.info(f"LLM generated SQL: {generated_sql[:200]}...") 

        # Step 4: Execute the generated query against the database.
        execution_result = talktoDbservice.execute_query(
            conn_str=str(request.connection_string),
            sql_query=generated_sql
        )

        # Step 5: Combine the results into a validated response model.
        return schemas.NaturalLanguageQueryResponse(
            generated_sql=generated_sql,
            **execution_result
        )

    # Replicate the exact error handling pattern from your reference code.
    except (DatabaseServiceError, LLMServiceError) as e:
        logger.error(f"A service error occurred: {e}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"An unexpected internal error occurred in generate_and_run_sql: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected internal server error occurred.")