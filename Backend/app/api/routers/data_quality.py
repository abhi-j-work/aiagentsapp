# In file: app/api/routers/data_quality.py

import logging
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, ValidationError

from app.core.config import Settings, get_settings
from app.api import models
from app.services import db_service, llm_service
from app.services.errors import DatabaseServiceError, LLMServiceError

logger = logging.getLogger(__name__)    

router = APIRouter(
    prefix="/data-quality",
    tags=["Data Quality Agent"]
)

def _get_conn_str(provided_str: Optional[str], settings: Settings) -> str:
    conn_str = provided_str or settings.DATABASE_URL
    if not conn_str:
        raise HTTPException(status_code=400, detail="DB connection string not provided and not configured on server.")
    return conn_str

# ===================================================================
# ENDPOINT 1: Generate a plan of proposed checks
# ===================================================================
@router.post("/generate-quality-plan", response_model=models.GenerateQualityPlanResponse)
async def generate_quality_plan(
    params: models.GenerateQualityPlanRequest, 
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    """
    Analyzes a table's schema and generates a list of recommended data quality checks.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        schema_dict = await db_service.extract_db_schema(conn_str)
        
        target_table_schema = schema_dict.get("tables", {}).get(params.table_name)
        if not target_table_schema:
            raise HTTPException(status_code=404, detail=f"Table '{params.table_name}' not found in the database.")

        system_prompt = f"""
        You are a Senior Data Quality Analyst specializing in PostgreSQL. Your task is to analyze the schema of a single database table and generate a JSON list of proposed data quality checks.

        **Core Task:**
        For the given table schema, proactively identify potential data quality issues based on column names and data types. For each potential issue, you must formulate a specific check.

        **For each check, you must generate:**
        1.  `check_id`: A unique, machine-friendly snake_case identifier (e.g., 'email_format_check').
        2.  `rule_name`: A human-readable title (e.g., 'Invalid Email Format').
        3.  `rule_description`: A clear explanation of the rule.
        4.  `check_sql`: A complete, executable PostgreSQL query that **COUNTS the number of rows VIOLATING the rule**. This query must always start with `SELECT COUNT(*) FROM`. All identifiers in the SQL must be double-quoted.

        **Example Checks to Generate:**
        - **NULL Check:** For a column "email", generate a check for null emails.
        - **UNIQUENESS Check:** For a column "username", generate a check for duplicate usernames.
        - **FORMAT Check:** For a column "phone_number", generate a check for values that don't match a standard phone format.
        - **RANGE Check:** For a column "birth_date", generate a check for dates in the future.
        - **DUPLICATE ROW Check:** For the table, generate a check for entire duplicate rows.

        **Output Format (Strict JSON Only):**
        - Your ONLY output must be a single, valid JSON object.
        - The root key must be `"proposed_checks"`, which is a list of the check objects you generated.
        """
        user_prompt = f"Generate a data quality plan for the table `{params.table_name}` with the following schema:\n{json.dumps(target_table_schema, indent=2)}"

        response_json_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        logger.info(f"Raw quality plan from AI: {response_json_str}")
        
        # Use a temporary model to validate the LLM's direct output
        class LLMPlanResponse(BaseModel):
            proposed_checks: List[models.ProposedQualityCheck]
        
        validated_plan = LLMPlanResponse.model_validate_json(response_json_str)
        
        return models.GenerateQualityPlanResponse(
            table_name=params.table_name,
            proposed_checks=validated_plan.proposed_checks
        )

    except (ValidationError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=502, detail=f"The AI agent returned a plan in an invalid format: {e}")
    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))


# ===================================================================
# ENDPOINT 2: Execute the selected checks
# ===================================================================
@router.post("/execute-quality-checks", response_model=models.ExecuteQualityChecksResponse)
async def execute_quality_checks(
    params: models.ExecuteQualityChecksRequest, 
    settings: Settings = Depends(get_settings)
):
    """
    Executes a list of selected data quality checks and returns a validation report.
    This endpoint does not use an LLM; it is for pure execution.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        final_results = []

        if not params.checks_to_run:
            raise HTTPException(status_code=400, detail="No checks were provided to execute.")
        
        # Get total row count once for context
        total_rows = await db_service.execute_scalar_query(conn_str, f'SELECT COUNT(*) FROM "{params.table_name}"')

        for check in params.checks_to_run:
            logger.info(f"Executing check: {check.rule_name}")
            invalid_count = await db_service.execute_scalar_query(conn_str, check.check_sql)
            
            result = models.ValidationResult(
                check_id=check.check_id,
                rule_name=check.rule_name,
                is_valid=(invalid_count == 0),
                invalid_count=invalid_count,
                total_rows=total_rows,
                check_query=check.check_sql
            )
            final_results.append(result)
        
        return models.ExecuteQualityChecksResponse(
            table_name=params.table_name,
            validation_results=final_results
        )
        
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)