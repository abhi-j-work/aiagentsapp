import logging
import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.api import models
from app.services import db_service, llm_service
from app.services.errors import DatabaseServiceError, LLMServiceError
from app.logic.data_gov_logic import clean_masking_plan

import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/data-gov",
    tags=["Data Governance Workflow"]
)

def _get_conn_str(provided_str: Optional[str], settings: Settings) -> str:
    conn_str = provided_str or settings.DATABASE_URL
    if not conn_str:
        raise HTTPException(status_code=400, detail="DB connection string not provided and not configured on server.")
    return conn_str

@router.post("/schema", response_model=models.SchemaResponse)
async def extract_schema(params: models.DBParams, settings: Settings = Depends(get_settings)):
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        schema_dict = await db_service.extract_db_schema(conn_str)
        validated_schema = models.ExtractedSchema.model_validate(schema_dict)
        return models.SchemaResponse(schema_data=validated_schema)
    except ValidationError as e:
        logger.error(f"Failed to validate the extracted schema: {e}")
        raise HTTPException(status_code=500, detail=f"The extracted database schema has an unexpected structure: {e}")
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/explain_referential_integrity", response_model=models.ReferentialIntegrityResponse)
async def explain_referential_integrity(params: models.DBParams, settings: Settings = Depends(get_settings)):
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        schema_dict = await db_service.extract_db_schema(conn_str)
        validated_schema = models.ExtractedSchema.model_validate(schema_dict)
        
        foreign_keys = validated_schema.foreign_keys
        if not foreign_keys:
            return models.ReferentialIntegrityResponse(explanation="No foreign key relationships found.", foreign_keys_found=[])

        system_prompt = """
        You are an expert data strategist and business analyst. Your job is to analyze a database schema and translate it into a holistic business intelligence report for a non-technical executive.

        You will explain two types of data structures:
        1.  **Data Relationships:** The connections between tables (foreign keys).
        2.  **Foundational Tables:** Core tables that do not depend on others.

        **Your Task:**
        Based on the provided list of `foreign_keys` and `all_tables`, generate a JSON object with two sections.

        **Part 1: Data Relationships**
        For each foreign key, generate a three-part explanation.
        - **The Business Rule:** A simple English statement of the rule (e.g., "Every `Order` must belong to an existing `Customer`.").
        - **The Analogy:** A simple, real-world analogy to explain the link.
        - **Impact of Change:** A clear warning about the "ripple effect" of breaking this link.

        **Part 2: Foundational Data Tables**
        First, identify the foundational tables. These are tables from the `all_tables` list that **do not appear** as a `from_table` in any of the `foreign_keys`. These tables represent master data or independent entities.
        For each foundational table you identify, provide:
        - **Business Role:** Explain what this table represents in the business (e.g., "This is the master list of all valid countries.").
        - **Impact of Change:** Explain the risk of modifying or deleting this table. The risk is usually a large "domino effect" since other tables may depend on this one. Think of it as the foundation of a house.
        """
        user_prompt = f"Explain these foreign keys:\n{json.dumps([fk.model_dump() for fk in foreign_keys], indent=2)}"
        
        explanation_text = await llm_service.call_llm(system_prompt, user_prompt)
        
        return models.ReferentialIntegrityResponse(explanation=explanation_text, foreign_keys_found=foreign_keys)
    except (DatabaseServiceError, LLMServiceError, ValidationError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))


@router.post("/classify_data", response_model=models.ClassificationResponse)
async def classify_data(params: models.ClassificationRequest, settings: Settings = Depends(get_settings)):
    try:
        schema_to_classify = params.schema_data
        if not schema_to_classify:
            conn_str = _get_conn_str(params.connection_string, settings)
            schema_dict = await db_service.extract_db_schema(conn_str)
            schema_to_classify = models.ExtractedSchema.model_validate(schema_dict)

        
      

        system_prompt = """
        You are an expert data privacy and governance analyst. Your task is to classify each column in the provided database schema.

        RULES:
        1. You MUST return ONLY a single, valid JSON object.
        2. The root key of the JSON object must be "classification_results".
        3. The value of "classification_results" MUST be a JSON array (a list of objects `[]`).
        4. Each object in the array represents a table and must have a "table_name" and a "columns" key.
        5. For each column, provide a `classification` from this exact list: ["Public/Non-Sensitive", "Internal/Confidential", "PII", "Sensitive"].
        6. Also provide a brief `reasoning` string for your classification choice.

        ### EXAMPLE OF DESIRED JSON OUTPUT ###
        {
        "classification_results": [
            {
            "table_name": "users",
            "columns": [
                {
                "column_name": "id",
                "data_type": "INTEGER",
                "classification": "Internal/Confidential",
                "reasoning": "Internal identifier, not sensitive."
                },
                {
                "column_name": "email",
                "data_type": "VARCHAR",
                "classification": "PII",
                "reasoning": "Email is Personally Identifiable Information."
                }
            ]
            }
        ]
        }
        """
        user_prompt = f"Classify the columns in this schema:\n{json.dumps(schema_to_classify.model_dump(), indent=2)}"
        
        response_json_str = await llm_service.call_llm(system_prompt, user_prompt, response_format={"type": "json_object"})
        
        logger.info(f"Raw classification response from AI: {response_json_str}")
        return models.ClassificationResponse.model_validate_json(response_json_str)
    except (ValidationError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=502, detail=f"The AI agent returned data in an invalid format: {e}")
    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))


@router.post("/generate_masking_sql", response_model=models.SQLGenerationResponse)
async def generate_masking_sql(params: models.MaskingRequest, settings: Settings = Depends(get_settings)):
    try:
        system_prompt = """
        You are a meticulous, senior PostgreSQL database administrator. Your only task is to generate a JSON data masking plan that produces 100% syntactically correct and executable PostgreSQL SQL.

        **Golden Rules - You MUST follow these without exception:**

        1.  **Absolute Identifier Quoting:** Every single identifier (table names, column names, and aliases) MUST be enclosed in double quotes (""). This is the most important rule.
            - Correct: `"users"`, `"email"`, `AS "email"`
            - Incorrect: `users`, `email`, `AS email`

        2.  **Strict Type Safety in CASE Statements:** Every branch of a `CASE` statement MUST return the exact same data type. To guarantee this, you MUST explicitly cast the masked value in the `ELSE` clause to match the original column's data type.
            - For `text`, `varchar`, `char`: Use `'<redacted>'::text`.
            - For `numeric`, `decimal`: Use `0::numeric`.
            - For `integer`, `bigint`, `smallint`: Use `0::integer`.
            - For `timestamp`, `timestamptz`, `date`: Use `'1970-01-01 00:00:00'::timestamp`.
            - For `boolean`: Use `FALSE::boolean`.
            - For `uuid`: Use `'00000000-0000-0000-0000-000000000000'::uuid`.

        3.  **Referential Integrity is Sacred:** Columns classified as 'PK' (Primary Key) or 'FK' (Foreign Key) MUST NEVER be masked. Their `select_expression` must be only the double-quoted column name.

        **Input Context:**

        You will receive a JSON array describing tables. For each column, you are given its `column_name`, `data_type`, and `classification`. Use the `data_type` to apply the correct cast from Golden Rule #2.

        **Your Task:**

        Generate a single, valid JSON object that follows the specified output format. This JSON will be used to build role-based secure views in PostgreSQL. The masking logic MUST use `pg_has_role(current_user, 'admin', 'MEMBER')`. Admins see real data; others see masked data.

        **Output Format (JSON Only):**

        - Your entire output must be a single JSON object. No explanations, no markdown ````json.
        - The root key is `"tables"`, an array of objects.
        - Each table object has two keys:
        1. `"table_name"`: The string name of the table.
        2. `"columns"`: An array of column objects.
        - Each column object has one key:
        1. `"select_expression"`: The complete, syntactically perfect SQL string for selecting that column, following all Golden Rules.

        ---
            **Example Walkthrough**

            *   **For a sensitive `email` column (data_type: text):**
                `"select_expression": "CASE WHEN current_user= 'admin' THEN \"email\" ELSE '***  ' END AS \"email\""`

            *   **For a sensitive `balance` column (data_type: numeric):**
                `"select_expression": "CASE WHEN pg_has_role(current_user, 'admin', 'MEMBER') THEN \"balance\" ELSE 0::numeric END AS \"balance\""`

            *   **For a primary key `id` column (data_type: integer, classification: PK):**
                `"select_expression": "\"id\""`

            *   **For a non-sensitive `created_at` column (data_type: timestamp):**
                `"select_expression": "\"created_at\""`
            """

        user_prompt_data = [table.model_dump() for table in params.classification_results]
        user_prompt = f"Generate the JSON masking plan for this classification:\n{json.dumps(user_prompt_data, indent=2)}"
        
        # Step 2: Call the LLM
        response_json_str = await llm_service.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        logger.info(f"Raw masking plan response from AI: {response_json_str}")
        
        # Step 3: Parse and Validate directly. No more `clean_masking_plan`.
        llm_data = json.loads(response_json_str)
        validated_plan = models.LLMResponseModel.model_validate(llm_data)
        
        # Step 4: Generate SQL from the now-validated plan
        final_statements = []
        for table_plan in validated_plan.tables:
            # Skip if the LLM generated a table plan with no columns
            if not table_plan.columns:
                continue
            
            view_name = f"{table_plan.table_name}_governed_view"
            select_clauses = [col.select_expression for col in table_plan.columns]
            columns_sql = ",\n        ".join(select_clauses)
            
            create_view_sql = (
                f'CREATE OR REPLACE VIEW public."{view_name}" AS\n'
                f'    SELECT\n'
                f'        {columns_sql}\n'
                f'    FROM\n'
                f'        public."{table_plan.table_name}";'
            )
            final_statements.append(create_view_sql)
            
        return models.SQLGenerationResponse(
            sql_statements=final_statements,
            message=f"Successfully generated {len(final_statements)} SQL statements."
        )

    # Improved error handling for better debugging
    except json.JSONDecodeError as e:
        logger.error(f"LLM returned non-JSON response: {e}\nRaw Response: {response_json_str}")
        raise HTTPException(
            status_code=502,
            detail="The AI agent returned a malformed response that could not be parsed as JSON."
        )
    except ValidationError as e:
        logger.error(f"LLM response failed validation: {e}\nRaw Data: {llm_data}")
        # Providing the detailed validation error to the client can be very helpful for debugging
        raise HTTPException(
            status_code=502,
            detail=f"The AI agent returned data in an unexpected format. Validation errors: {e}"
        )
    except LLMServiceError as e:
        # This part was already good
        raise HTTPException(status_code=e.status_code, detail=e.message)