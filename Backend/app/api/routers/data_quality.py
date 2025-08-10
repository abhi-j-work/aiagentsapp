import logging
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, ValidationError

# Assume these are your project's modules.
from app.core.config import Settings, get_settings
from app.api import models
from app.services import db_service, llm_service, notification, evaluation_service
from app.services.errors import DatabaseServiceError, LLMServiceError

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/data-quality",
    tags=["Data Quality Agent"]
)

def _get_conn_str(provided_str: Optional[str], settings: Settings) -> str:
    """
    Retrieves the connection string, prioritizing the one provided in the
    request, and falling back to the one configured on the server.
    """
    conn_str = provided_str or settings.DATABASE_URL
    if not conn_str:
        raise HTTPException(status_code=400, detail="DB connection string not provided and not configured on server.")
    return conn_str

def _find_table_schema(user_table_name: str, all_tables: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
    """
    Finds the schema for a given table name, handling cases where the user
    might not provide the schema part of the name.
    """
    if user_table_name in all_tables:
        return user_table_name, all_tables[user_table_name]
    
    possible_matches = [
        key for key in all_tables
        if key == user_table_name or key.endswith(f".{user_table_name}")
    ]

    if len(possible_matches) == 1:
        qualified_name = possible_matches[0]
        return qualified_name, all_tables[qualified_name]
    
    if len(possible_matches) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"Ambiguous table name '{user_table_name}'. Found: {possible_matches}. Please provide a fully qualified name (e.g., 'schema.table')."
        )
    
    raise HTTPException(status_code=404, detail=f"Table '{user_table_name}' not found in the database.")

# ===================================================================
# ENDPOINT 1: Generate a plan of proposed checks
# ===================================================================
@router.post("/generate-quality-plan", response_model=models.GenerateQualityPlanResponse)
async def generate_quality_plan(
    request: Request, 
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    try:
        body = await request.json()
        params = models.GenerateDataProfileRequest(**body)
        user_custom_rules = body.get("custom_rules", "")

        conn_str = _get_conn_str(params.connection_string, settings)
        schema_dict = await db_service.extract_db_schema(conn_str)
        all_tables = schema_dict.get("tables", {})
        qualified_name, target_table_schema = _find_table_schema(params.table_name, all_tables)
        schema_name, table_name = qualified_name.strip('"').split('.', 1)
        
        final_custom_rules_prompt = ""
        if user_custom_rules and user_custom_rules.strip():
            final_custom_rules_prompt = f"---\n**Mandatory Custom Rules:**\n{user_custom_rules}\n---"

        system_prompt = f"""
        You are a Senior Data Quality Analyst. Your task is to analyze a database schema and generate a JSON list of data quality checks.
        The table you are analyzing is named "{table_name}" in schema "{schema_name}".

        **CRITICAL INSTRUCTIONS:**
        1.  **`check_sql`:** Your generated SQL query MUST count the number of rows that are **INVALID** or **VIOLATE** the rule.
        2.  **`rule_name`:** Because the SQL counts failures, the `rule_name` MUST describe the failure condition. It should be named from a "negative" perspective.
            - **Correct:** "Invalid Email Format", "Duplicate User IDs", "Missing Order Date"
            - **Incorrect:** "Valid Emails", "Unique Users", "Orders Have Dates"
        3.  **`rule_description`:** The description should clearly state what condition is being checked for.

        **Instructions for Each Check:**
        For every check you generate, you must provide:
        1.  `check_id`: A unique, machine-friendly snake_case identifier (e.g., 'invalid_email_format').
        2.  `rule_name`: A human-readable title describing the **FAILURE** condition (e.g., 'Invalid Email Format').
        3.  `rule_description`: A clear explanation of what the rule is checking.
        4.  `check_sql`: A PostgreSQL query that `SELECT COUNT(*)` of rows VIOLATING the rule.
            - The query must start with `SELECT COUNT(*) FROM`.
            - All identifiers MUST be double-quoted. `FROM "{schema_name}"."{table_name}"`.
        
        {final_custom_rules_prompt}

        **Output Format (Strict JSON Only):**
        - The root key of the JSON object must be `"proposed_checks"`.
        """

        user_prompt = f"Generate a data quality plan for the table `{qualified_name}` which has the following schema:\n{json.dumps(target_table_schema, indent=2)}"
        
        response_json_str = await llm_service_instance.call_llm(system_prompt, user_prompt, response_format={"type": "json_object"})
        
        class LLMPlanResponse(BaseModel):
            proposed_checks: List[models.ProposedQualityCheck]
        
        validated_plan = LLMPlanResponse.model_validate_json(response_json_str)
        
        logger.info("Evaluating generated DQ plan with LLM Judge...")
        evaluation_result = await evaluation_service.judge_data_quality_plan(
            table_name=qualified_name,
            proposed_checks=validated_plan.model_dump()["proposed_checks"]
        )

        return models.GenerateQualityPlanResponse(
            table_name=qualified_name,
            proposed_checks=validated_plan.proposed_checks,
            evaluation=evaluation_result
        )

    except Exception as e:
        logger.exception(f"An unexpected error occurred during quality plan generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

       

# ===================================================================
# ENDPOINT 2: Execute the selected checks
# ===================================================================
@router.post("/execute-quality-checks", response_model=models.ExecuteQualityChecksResponse)
async def execute_quality_checks(
    request: Request,
    settings: Settings = Depends(get_settings)
):
    try:
        body = await request.json()
        params = models.ExecuteQualityChecksRequest(**body)
        conn_str = _get_conn_str(params.connection_string, settings)
        final_results = []

        if not params.checks_to_run:
            raise HTTPException(status_code=400, detail="No checks were provided to execute.")
        
        qualified_name = params.table_name
        total_rows = await db_service.execute_scalar_query(conn_str, f'SELECT COUNT(*) FROM {qualified_name}')
        
        for check in params.checks_to_run:
            logger.info(f"Executing check: '{check.rule_name}' on table {qualified_name}")
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
            
        report = models.ExecuteQualityChecksResponse(table_name=qualified_name, validation_results=final_results)
        
        try:
             await notification.send_data_quality_summary_notification(report) 
        except Exception as e:
            logger.error(f"Failed to send notification for report on table {qualified_name}: {e}")

        return report
        
    except Exception as e:
        logger.exception("An unexpected error occurred during quality check execution.")
        raise HTTPException(status_code=500, detail=str(e))

# ===================================================================
# ENDPOINT 3: Generate a descriptive profile of a table using an LLM
# ===================================================================
@router.post("/generate-profile", response_model=models.GenerateDataProfileResponse)
async def generate_data_profile(
    params: models.GenerateDataProfileRequest,
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service),
):
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        schema_dict = await db_service.extract_db_schema(conn_str)
        all_tables = schema_dict.get("tables", {})
        
        qualified_name, target_table_schema = _find_table_schema(params.table_name, all_tables)

        system_prompt = f"""
        You are a senior data analyst AI capable of profiling PostgreSQL tables using only schema metadata.
        You are given the table name and its column metadata. Based on this, generate a descriptive data profile.

        For each column, provide:
        - column_name
        - inferred_type (based on data_type)
        - assumptions_about_data (based on name/type)
        - potential_quality_risks (e.g., missing values, inconsistent formats)
        - common_patterns_or_values (hypothetical patterns)

        Output JSON format:
        {{
          "table_name": "{qualified_name}",
          "columns": [
            {{
              "column_name": "user_id",
              "inferred_type": "Integer ID",
              "assumptions_about_data": "Likely a unique identifier for each user.",
              "potential_quality_risks": "Duplicates, nulls, unexpected negative values.",
              "common_patterns_or_values": "Sequential integers like 1, 2, 3, ..."
            }}
          ]
        }}
        """

        user_prompt = f"""
        Table schema: {json.dumps(target_table_schema, indent=2)}
        You do not have access to live data. Only use this metadata.
        """

        response_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        logger.info(f"Data profile from AI: {response_str}")

        class AIColumnProfile(BaseModel):
            column_name: str
            inferred_type: str
            assumptions_about_data: str
            potential_quality_risks: str
            common_patterns_or_values: str

        class AIProfileResponse(BaseModel):
            table_name: str
            columns: List[AIColumnProfile]

        profile_obj = AIProfileResponse.model_validate_json(response_str)
        return profile_obj

    except (ValidationError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=502, detail=f"The AI agent returned an invalid profile format: {e}")
    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during AI data profiling.")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")