# File: app/api/routers/data_quality_router.py

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
# ===========================================================


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
            final_custom_rules_prompt = f"---\n**Mandatory Custom Rules To Follow:**\n{user_custom_rules}\n---"
        
        # --- START: THE FINAL, DEFINITIVE FIX ---
        system_prompt = f"""
        You are a Senior Data Quality Analyst. Your task is to generate a comprehensive quality plan in JSON format for the table "{schema_name}"."{table_name}".

        **CRITICAL OUTPUT STRUCTURE:**
        1.  Your entire response **MUST** be a single JSON object.
        2.  The root of this JSON object **MUST** have exactly two keys: `table_name` and `proposed_checks`.
        3.  The value for `table_name` MUST be the fully qualified table name: "{qualified_name}".
        4.  The value for `proposed_checks` MUST be a JSON array `[]`.

        **CRITICAL INSTRUCTIONS FOR EACH CHECK IN THE ARRAY:**
        1.  Each check object **MUST** have four keys: `check_id`, `rule_name`, `rule_description`, and `check_sql`.
        2.  `check_id`: A unique, machine-friendly snake_case **STRING**. It must be a string, not a number.
        3.  `rule_name`: A human-readable name describing the **FAILURE** condition (e.g., "Invalid Email Format").
        4.  `check_sql`: A PostgreSQL query that `SELECT COUNT(*)` of rows that **VIOLATE** the rule. All identifiers MUST be double-quoted.

        {final_custom_rules_prompt}

        **EXAMPLE OF THE EXACT, PERFECT JSON OUTPUT YOU MUST PROVIDE:**
        ```json
        {{
          "table_name": "{qualified_name}",
          "proposed_checks": [
            {{
              "check_id": "missing_email",
              "rule_name": "Missing Email Address",
              "rule_description": "Checks for rows where the email address is NULL.",
              "check_sql": "SELECT COUNT(*) FROM \\"{schema_name}\\".\\"{table_name}\\" WHERE \\"email\\" IS NULL;"
            }}
          ]
        }}
        ```
        """
        # --- END: THE FINAL, DEFINITIVE FIX ---

        user_prompt = f"Generate a data quality plan for the table `{qualified_name}` with the schema:\n{json.dumps(target_table_schema, indent=2)}"
        
        response_json_str = await llm_service_instance.call_llm(system_prompt, user_prompt, response_format={"type": "json_object"})
        
        validated_response = models.GenerateQualityPlanResponse.model_validate_json(response_json_str)
        
        # evaluation_result_dict = await evaluation_service.judge_data_quality_plan(
        #     table_name=qualified_name,
        #     proposed_checks=validated_response.model_dump()["proposed_checks"]
        # )
        
        # validated_response.evaluation = models.EvaluationResult.model_validate(evaluation_result_dict)
        return validated_response

    except (ValidationError, json.JSONDecodeError) as e:
        logger.error(f"The AI agent returned an invalid plan format. Error: {e}. Raw response: {locals().get('response_json_str', 'N/A')}")
        raise HTTPException(status_code=502, detail=f"The AI agent returned an invalid plan format: {e}")
    except Exception as e:
        logger.exception(f"An unexpected error occurred during quality plan generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
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

        # --- START: THE FINAL FIX FOR THE PROFILE ERROR ---
        # This new prompt is extremely strict to prevent validation errors.
        system_prompt = f"""
        You are a senior data analyst AI. Your task is to generate a descriptive data profile for a PostgreSQL table using only its schema metadata.

        **CRITICAL OUTPUT INSTRUCTIONS:**
        1.  Your entire response **MUST** be a single JSON object.
        2.  The root of this JSON object **MUST** have exactly two keys: `table_name` and `columns`.
        3.  **DO NOT** wrap your response in any other keys like "data_profile" or "profile".

        **Content Guidelines for each column:**
        - `column_name`: The name of the column.
        - `inferred_type`: A human-friendly type based on the data_type (e.g., "Integer ID", "Timestamp", "User Email").
        - `assumptions_about_data`: Your professional assumptions based on the column name and type.
        - `potential_quality_risks`: Common data quality issues for this type of column.
        - `common_patterns_or_values`: Hypothetical examples of data you might find in this column.
        
        **Example of the EXACT required output structure:**
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
        # --- END: THE FINAL FIX ---

        user_prompt = f"Profile the table with the following schema:\n{json.dumps(target_table_schema, indent=2)}"

        response_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        logger.info(f"Data profile from AI: {response_str}")

        # Pydantic validation will now pass because the prompt forces the correct structure.
        return models.GenerateDataProfileResponse.model_validate_json(response_str)

    except (ValidationError, json.JSONDecodeError) as e:
        logger.error(f"The AI agent returned an invalid profile format: {e}. Raw response: {locals().get('response_str', 'N/A')}")
        raise HTTPException(status_code=502, detail=f"The AI agent returned an invalid profile format: {e}")
    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during AI data profiling.")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


@router.post("/generate-remediation-sql", response_model=models.GenerateRemediationResponse)
async def generate_remediation_sql(
    params: models.GenerateRemediationRequest,
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service),
):
    remediation_plan = []
    failed_checks = [check for check in params.validation_results if not check.is_valid]

    if not failed_checks:
        raise HTTPException(status_code=400, detail="No failed checks found in the report to remediate.")

    # This prompt is now completely changed to generate a VIEW instead of UPDATE/DELETE
    system_prompt = """
    You are a PostgreSQL data analyst. Your task is to write a single, non-destructive SQL statement to create a view that hides rows with data quality issues.

    **CRITICAL RULES:**
    1.  Your entire response **MUST** be a single JSON object.
    2.  The JSON object must contain a single key: "remediation_sql".
    3.  The value of "remediation_sql" must be a single string containing one `CREATE OR REPLACE VIEW` statement. **DO NOT** generate UPDATE or DELETE statements.
    4.  All identifiers (schema, table, and view names) in the SQL **MUST** be double-quoted.
    5.  The view name must be the original table name with `_filtered_view` appended. For example, a view for `"public"."users"` should be named `"public"."users_filtered_view"`.
    6.  The `check_sql` provided by the user identifies the **BAD** rows. Your view must do the opposite: it must **SELECT ONLY THE GOOD ROWS**. This means you must invert the logic from the user's `WHERE` clause.
    
    **EXAMPLE TASK:**
    - User provides `check_sql`: `SELECT COUNT(*) FROM "public"."users" WHERE "email" IS NULL;`
    - Your Logic: The check finds rows where `email` is null. To get the good rows, I need a `WHERE` clause for `email` is **NOT** null.
    - Your `remediation_sql` Output: `CREATE OR REPLACE VIEW "public"."users_filtered_view" AS SELECT * FROM "public"."users" WHERE "email" IS NOT NULL;`

    **FINAL JSON OUTPUT EXAMPLE:**
    {
      "remediation_sql": "CREATE OR REPLACE VIEW \\"public\\".\\"users_filtered_view\\" AS SELECT * FROM \\"public\\".\\"users\\" WHERE \\"email\\" IS NOT NULL;"
    }
    """

    for check in failed_checks:
        try:
            # Extracting schema and table name for view creation
            schema_name, table_name = params.table_name.strip('"').split('.', 1)
            view_name = f'{table_name}_filtered_view'

            user_prompt = f"""
            The table `{params.table_name}` has a data quality issue.
            - **Rule Violated:** "{check.rule_name}"
            - **SQL to find invalid rows:** `{check.check_query}`
            
            Based on this, generate a `CREATE OR REPLACE VIEW` statement named `"{schema_name}"."{view_name}"` that selects all columns from the original table but excludes the invalid rows.
            """
            response_str = await llm_service_instance.call_llm(
                system_prompt, user_prompt, response_format={"type": "json_object"}
            )
            
            class RemediationSQLResponse(BaseModel):
                remediation_sql: str
            
            validated_sql = RemediationSQLResponse.model_validate_json(response_str)

            remediation_plan.append(models.RemediationSQL(
                check_id=check.check_id,
                rule_name=check.rule_name,
                remediation_sql=validated_sql.remediation_sql
            ))

        except (ValidationError, json.JSONDecodeError) as e:
            logger.error(f"AI returned invalid JSON for check '{check.check_id}': {e}. Raw response: {locals().get('response_str', 'N/A')}")
            continue
        except Exception as e:
            logger.error(f"An unexpected error occurred generating remediation for check '{check.check_id}': {e}")
            continue
            
    return models.GenerateRemediationResponse(remediation_plan=remediation_plan)


# ===================================================================
# ENDPOINT 4: Apply the Generated Remediation Plan (Creates Views)
# ===================================================================
@router.post("/apply-remediation-plan", response_model=models.ApplyRemediationResponse)
async def apply_remediation_plan(
    params: models.ApplyRemediationRequest, 
    settings: Settings = Depends(get_settings)
):
    try:
        if not params.remediation_plan:
            raise HTTPException(status_code=400, detail="No SQL statements provided in the plan to apply.")

        conn_str = _get_conn_str(params.connection_string, settings)
        
        statements_to_run = [item.remediation_sql for item in params.remediation_plan]
        await db_service.execute_statements(conn_str, statements_to_run)
        
        return models.ApplyRemediationResponse(
            message=f"Successfully applied {len(statements_to_run)} filtering view(s) to the database.",
            executed_statements=len(statements_to_run)
        )
        
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error applying remediation plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred while applying the remediation plan.")


# ===================================================================
# ENDPOINT 5: Generate a descriptive profile of a table using an LLM
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
        You are a senior data analyst AI. Your task is to generate a descriptive data profile for a PostgreSQL table using only its schema metadata.

        **CRITICAL OUTPUT INSTRUCTIONS:**
        1.  Your entire response **MUST** be a single JSON object.
        2.  The root of this JSON object **MUST** have exactly two keys: `table_name` and `columns`.
        3.  **DO NOT** wrap your response in any other keys like "data_profile" or "profile".

        **Content Guidelines for each column:**
        - `column_name`: The name of the column.
        - `inferred_type`: A human-friendly type based on the data_type (e.g., "Integer ID", "Timestamp", "User Email").
        - `assumptions_about_data`: Your professional assumptions based on the column name and type.
        - `potential_quality_risks`: Common data quality issues for this type of column.
        - `common_patterns_or_values`: Hypothetical examples of data you might find in this column.
        
        **Example of the EXACT required output structure:**
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

        user_prompt = f"Profile the table with the following schema:\n{json.dumps(target_table_schema, indent=2)}"

        response_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        logger.info(f"Data profile from AI: {response_str}")
        
        return models.GenerateDataProfileResponse.model_validate_json(response_str)

    except (ValidationError, json.JSONDecodeError) as e:
        logger.error(f"The AI agent returned an invalid profile format: {e}. Raw response: {locals().get('response_str', 'N/A')}")
        raise HTTPException(status_code=502, detail=f"The AI agent returned an invalid profile format: {e}")
    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during AI data profiling.")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")



@router.post("/list-filtered-views", response_model=models.ListFilteredViewsResponse)
async def list_filtered_views(
    params: models.DBParams,
    settings: Settings = Depends(get_settings)
):
    """
    Scans the database and returns a list of all views created by the
    data quality agent (i.e., those ending in '_filtered_view').
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        
        # This query specifically looks for views matching the pattern in the public schema.
        query = """
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public' AND table_name LIKE '%%_filtered_view';
        """
        
        view_records = await db_service.execute_query_as_dict(conn_str, query)
        view_names = [record['table_name'] for record in view_records]
        
        logger.info(f"Found {len(view_names)} filtered views.")
        
        return models.ListFilteredViewsResponse(filtered_views=view_names)

    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error listing filtered views: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")

@router.post("/fetch-filtered-view-data", response_model=models.FetchViewDataResponse)
async def fetch_filtered_view_data(
    params: models.FetchViewDataRequest, 
    settings: Settings = Depends(get_settings)
):
    """
    Fetches paginated data from a specified filtered view, assuming a specific
    database role for the duration of the query. This allows testing the view.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        view_name = params.view_name
        
        # We can add a check to ensure we only query our specific filtered views
        if not view_name.endswith('_filtered_view'):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid view name. Only views ending in '_filtered_view' can be queried by this endpoint."
            )
        
        logger.info(f"Fetching data from filtered view '{view_name}' as role '{params.role}' with limit {params.limit}, offset {params.offset}.")
        
        # We can reuse the generic fetch_view_data service function
        data_rows = await db_service.fetch_view_data(
            conn_str=conn_str,
            view_name=view_name,
            limit=params.limit,
            offset=params.offset
        )
        
        return models.FetchViewDataResponse(
            view_name=view_name,
            row_count=len(data_rows),
            data=data_rows
        )

    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error fetching filtered view data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")
