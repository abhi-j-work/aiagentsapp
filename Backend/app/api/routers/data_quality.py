import logging
import json
from typing import List, Optional, Dict, Any
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

def _find_table_schema(user_table_name: str, all_tables: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
    """
    Finds the schema for a given table name, handling cases where the user
    might not provide the schema part of the name.
    """
    # 1. Try a direct lookup first (e.g., user provides "public.users")
    if user_table_name in all_tables:
        return user_table_name, all_tables[user_table_name]

    # 2. If direct lookup fails, search for a unique match
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
    
    # 3. If no matches are found at all
    raise HTTPException(status_code=404, detail=f"Table '{user_table_name}' not found in the database.")


# ===================================================================
# ENDPOINT 0: Generate a data profile of a table
# ===================================================================
# @router.post("/generate-data-profile", response_model=models.GenerateDataProfileResponse)
# async def generate_data_profile(
#     params: models.GenerateDataProfileRequest,
#     settings: Settings = Depends(get_settings),
# ):
#     try:
#         conn_str = _get_conn_str(params.connection_string, settings)
#         schema_dict = await db_service.extract_db_schema(conn_str)
#         print(schema_dict)
#         all_tables = schema_dict.get("tables", {})
        
#         # Use the helper to find the table and its fully qualified name
#         qualified_name, target_table_schema = _find_table_schema(params.table_name, all_tables)

#         columns_data = target_table_schema.get("columns", [])
#         total_rows = await db_service.execute_scalar_query(conn_str, f'SELECT COUNT(*) FROM "{qualified_name}"')
        
#         column_profiles = []
#         for column in columns_data:
#             col_name = column['column_name']
#             col_type_raw = column['data_type']
#             col_type = col_type_raw.lower()
            
#             logger.info(f"Profiling column: '{col_name}' in table '{qualified_name}'")
            
#             if total_rows == 0:
#                 profile_data = { "column_name": col_name, "data_type": col_type_raw, "total_values": 0, "null_count": 0, "null_percentage": 0.0, "distinct_count": 0, "distinct_percentage": 0.0 }
#             else:
#                 base_metrics_sql = f'SELECT COUNT(*) FILTER (WHERE "{col_name}" IS NULL) AS null_count, COUNT(DISTINCT "{col_name}") AS distinct_count FROM "{qualified_name}";'
#                 base_stats = await db_service.execute_query_as_dict(conn_str, base_metrics_sql)
                
#                 profile_data: Dict[str, Any] = {
#                     "column_name": col_name, "data_type": col_type_raw, "total_values": total_rows,
#                     "null_count": base_stats[0]['null_count'], "null_percentage": round(base_stats[0]['null_count'] / total_rows, 4),
#                     "distinct_count": base_stats[0]['distinct_count'], "distinct_percentage": round(base_stats[0]['distinct_count'] / total_rows, 4),
#                 }

#                 if any(t in col_type for t in ['int', 'numeric', 'decimal', 'real', 'double']):
#                     numeric_sql = f'SELECT MIN("{col_name}") as min_value, MAX("{col_name}") as max_value, AVG("{col_name}") as avg_value, STDDEV("{col_name}") as std_dev FROM "{qualified_name}" WHERE "{col_name}" IS NOT NULL;'
#                     stats = await db_service.execute_query_as_dict(conn_str, numeric_sql)
#                     if stats: profile_data.update(stats[0])
#                 elif any(t in col_type for t in ['char', 'text', 'varchar']):
#                     text_sql = f'SELECT MIN(LENGTH("{col_name}"::text)) as min_length, MAX(LENGTH("{col_name}"::text)) as max_length, AVG(LENGTH("{col_name}"::text)) as avg_length FROM "{qualified_name}" WHERE "{col_name}" IS NOT NULL;'
#                     stats = await db_service.execute_query_as_dict(conn_str, text_sql)
#                     if stats: profile_data.update(stats[0])
#                 elif any(t in col_type for t in ['date', 'timestamp']):
#                     date_sql = f'SELECT MIN("{col_name}") as earliest_date, MAX("{col_name}") as latest_date FROM "{qualified_name}" WHERE "{col_name}" IS NOT NULL;'
#                     stats = await db_service.execute_query_as_dict(conn_str, date_sql)
#                     if stats:
#                         profile_data['earliest_date'] = str(stats[0]['earliest_date']) if stats[0]['earliest_date'] else None
#                         profile_data['latest_date'] = str(stats[0]['latest_date']) if stats[0]['latest_date'] else None
            
#             column_profiles.append(models.ColumnProfile(**profile_data))

#         return models.GenerateDataProfileResponse(table_name=qualified_name, column_profiles=column_profiles)
        
#     except (DatabaseServiceError, LLMServiceError) as e:
#         raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))
#     except Exception as e:
#         logger.exception("An unexpected error occurred during data profiling.")
#         raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

# ===================================================================
# ENDPOINT 1: Generate a plan of proposed checks
# ===================================================================
@router.post("/generate-quality-plan", response_model=models.GenerateQualityPlanResponse)
async def generate_quality_plan(
    params: models.GenerateQualityPlanRequest, 
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        schema_dict = await db_service.extract_db_schema(conn_str)
        all_tables = schema_dict.get("tables", {})

        qualified_name, target_table_schema = _find_table_schema(params.table_name, all_tables)
        try:
            schema_name, table_name = qualified_name.strip('"').split('.', 1)
        except ValueError:
            schema_name = 'public'
            table_name = qualified_name.strip('"')

        system_prompt = f"""

        You are a Senior Data Quality Analyst specializing in PostgreSQL. Your task is to analyze the schema of a single database table and generate a JSON list of proposed data quality checks.
        The table you are analyzing is named "{table_name}" and it resides within the schema "{schema_name}".

        **Core Task:**
        For the given table schema, proactively identify potential data quality issues. For each potential issue, you must formulate a specific check.

        **For each check, you must generate:**
        1.  `check_id`: A unique, machine-friendly snake_case identifier (e.g., 'email_format_check').
        2.  `rule_name`: A human-readable title for the check (e.g., 'Invalid Email Format').
        3.  `rule_description`: A clear, human-readable explanation of what the rule is checking.
        4.  `check_sql`: A complete, executable PostgreSQL query that **COUNTS the number of rows VIOLATING the rule**.
            - The query MUST start with `SELECT COUNT(*) FROM`.
            - The schema and table name MUST be quoted separately and correctly in the `FROM` clause, precisely like this: `FROM "{schema_name}"."{table_name}"`.
            - All column identifiers within the query (e.g., in `WHERE` or `HAVING` clauses) MUST also be double-quoted.

        **Example of a correctly formatted `check_sql`:**
        `SELECT COUNT(*) FROM "{schema_name}"."{table_name}" WHERE "email" IS NULL;`

        **Output Format (Strict JSON Only):**
        - Your ONLY output must be a single, valid JSON object. Do not include any text, explanations, or code formatting before or after the JSON.
        - The root key of the JSON object must be `"proposed_checks"`, which is a list of the check objects you generated.
        """
        user_prompt = f"Generate a data quality plan for the table `{table_name}` with the following schema:\n{json.dumps(target_table_schema, indent=2)}"

        response_json_str = await llm_service_instance.call_llm(system_prompt, user_prompt, response_format={"type": "json_object"})
        logger.info(f"Raw quality plan from AI: {response_json_str}")
        
        class LLMPlanResponse(BaseModel):
            proposed_checks: List[models.ProposedQualityCheck]
        
        validated_plan = LLMPlanResponse.model_validate_json(response_json_str)
        
        return models.GenerateQualityPlanResponse(table_name=qualified_name, proposed_checks=validated_plan.proposed_checks)

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
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        final_results = []

        if not params.checks_to_run:
            raise HTTPException(status_code=400, detail="No checks were provided to execute.")
        
        # NOTE: We trust the table name from the request as it comes from the previous step's response.
        qualified_name = params.table_name
        table_name_only = qualified_name.split('.')[-1].replace('"', '')
        print(table_name_only)
        total_rows = await db_service.execute_scalar_query(conn_str, f'SELECT COUNT(*) FROM "{table_name_only}"')
        print(total_rows)
        for check in params.checks_to_run:
            logger.info(f"Executing check: {check.rule_name} on table {table_name_only}")
            invalid_count = await db_service.execute_scalar_query(conn_str, check.check_sql)
            
            result = models.ValidationResult(
                check_id=check.check_id,
                rule_name=check.rule_name,
                is_valid=(invalid_count == 0),
                # is_valid=True,
                invalid_count=invalid_count,
                total_rows=total_rows,
                check_query=check.check_sql
            )
            final_results.append(result)
        
        return models.ExecuteQualityChecksResponse(table_name=table_name_only, validation_results=final_results)
        
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    


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

        # Step 1: Prepare prompt for LLM
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
            }},
            ...
          ]
        }}
        """

        user_prompt = f"""
        Table schema: {json.dumps(target_table_schema, indent=2)}
        You do not have access to live data. Only use this metadata.
        """

        # Step 2: LLM call
        response_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        logger.info(f"Data profile from AI: {response_str}")

        # Step 3: Validate and return
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
