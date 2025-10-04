import io
import logging
import json
from turtle import pd
from typing import Optional
import docx
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from app.core.config import Settings, get_settings # type: ignore
from app.api import models # type: ignore
from app.services import db_service, evaluation_service, llm_service, notification # type: ignore
from app.services.errors import DatabaseServiceError, LLMServiceError # type: ignore

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
async def explain_referential_integrity(
    params: models.DBParams, 
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        schema_dict = await db_service.extract_db_schema(conn_str)
        validated_schema = models.ExtractedSchema.model_validate(schema_dict)
        
        all_table_names = [table for table in validated_schema.tables]
        foreign_keys_data = [fk.model_dump() for fk in validated_schema.foreign_keys]

        user_prompt_data = {
            "foreign_keys": foreign_keys_data,
            "all_tables": all_table_names
        }
        
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
        - **Impact of Change:** A clear warning about the "ripple effect" of breaking this link.
        **Part 2: Foundational Data Tables**
        First, identify the foundational tables. These are tables from the `all_tables` list that **do not appear** as a `from_table` in any of the `foreign_keys`.
        For each foundational table you identify, provide:
        - **Business Role:** Explain what this table represents in the business.
        - **Impact of Change:** Explain the risk of modifying or deleting this table.
        **Output Format (Strict JSON Only):**
        - Your ONLY output must be a single, valid JSON object. No explanations or text outside the JSON.
        - The root of the object must have TWO keys: `"relationship_explanations"` and `"foundational_tables"`.
        - `"relationship_explanations"` is an array of objects, each with keys: `from_table`, `to_table`, `business_rule`, and `impact_of_change`.
        - `"foundational_tables"` is an array of objects, each with keys: `table_name`, `business_role`, and `impact_of_change`.
        """
        user_prompt = f"Explain the schema based on this data:\n{json.dumps(user_prompt_data, indent=2)}"

        response_json_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        logger.info(f"Raw integrity explanation from AI: {response_json_str}")
        
        validated_explanation = models.ReferentialIntegrityResponse.model_validate_json(response_json_str)
        
        return validated_explanation

    except (ValidationError, json.JSONDecodeError) as e:
        raw_response = "N/A"
        if 'response_json_str' in locals():
            raw_response = response_json_str
        logger.error(f"LLM returned data in an invalid format: {e}\nRaw Response: {raw_response}")
        raise HTTPException(status_code=502, detail=f"The AI agent returned data in an invalid format: {e}")
    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))


@router.post("/classify_data", response_model=models.ClassificationResponse)
async def classify_data(
    params: models.ClassificationRequest, 
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
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
        
        response_json_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        
        classification_report = models.ClassificationResponse.model_validate_json(response_json_str)
        
        # logger.info("Evaluating generated classification with LLM Judge...")
        # evaluation_result = await evaluation_service.judge_data_classification(
        #     schema_str=json.dumps(schema_to_classify.model_dump(mode='json'), indent=2),
        #     classification_results=classification_report.model_dump(mode='json')["classification_results"]
        # )
        # classification_report.evaluation = evaluation_result
        
        try:
            await notification.send_data_classification_alert(classification_report)
        except Exception as e:
            logger.error(f"Failed to send data classification notification: {e}")
        
        # return classification_report
        logger.info(f"Raw classification response from AI: {response_json_str}")
        return models.ClassificationResponse.model_validate_json(response_json_str)
    except (ValidationError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=502, detail=f"The AI agent returned data in an invalid format: {e}")
    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))


@router.post("/generate_masking_sql", response_model=models.SQLGenerationResponse)
async def generate_masking_sql(
    params: models.MaskingRequest, 
    settings: Settings = Depends(get_settings),
    llm_service_instance: llm_service.LLMService = Depends(llm_service.get_llm_service)
):
    try:    
        system_prompt = """
        You are a meticulous, senior PostgreSQL database administrator. Your only task is to generate a JSON data masking plan that produces 100% syntactically correct and executable PostgreSQL SQL.
        **Golden Rules - You MUST follow these without exception:**
        1.  **Absolute Identifier Quoting:** Every single identifier (table names, column names, and aliases) MUST be enclosed in double quotes ("").
            - Correct: `"users"`, `"email"`, `AS "email"`
            - Incorrect: `users`, `email`, `AS email`
        2.  **User Check Logic:** The masking logic MUST use the simple user check: `current_user = 'admin'`. This logic determines if the user sees real data or masked data.
        3.  **Strict Type Safety in CASE Statements:** Every branch of a `CASE` statement MUST return the exact same data type. To guarantee this, you MUST explicitly cast the masked value in the `ELSE` clause to match the original column's data type.
            - For `text`, `varchar`, `char`: Use `'***'::text`.
            - For `numeric`, `decimal`: Use `0::numeric`.
            - For `integer`, `bigint`, `smallint`: Use `0::integer`.
            - For `timestamp`, `timestamptz`, `date`: Use `'1970-01-01 00:00:00'::timestamp`.
            - For `boolean`: Use `FALSE::boolean`.
            - For `uuid`: Use `'00000000-0000-0000-0000-000000000000'::uuid`.
            - The condition for seeing unmasked data is `current_user = 'admin'`.
            - The final `CASE` statement structure is: `CASE WHEN current_user = 'admin' THEN "column_name" ELSE [MASKING_LOGIC_WITH_CAST] END AS "column_name"`.
            - Provide default date only for timestamp columns and not for other data types.
        4.  **Referential Integrity is Sacred:** Columns classified as 'PK' (Primary Key) or 'FK' (Foreign Key) MUST NEVER be masked. Their `select_expression` must be only the double-quoted column name.
        **Input Context:**
        You will receive a JSON array describing tables. For each column, you are given its `column_name`, `data_type`, and `classification`. Use this information to apply the Golden Rules correctly.
        **Output Format (JSON Only):**
        - Your entire output must be a single JSON object. No explanations or markdown ````json.
        - The root key is `"tables"`, an array of objects.
        - Each table object has two keys: `"table_name"` and `"columns"`.
        - Each column object has one key: `"select_expression"`.
        ---
        **Example Walkthrough (Corrected and Consistent)**
        *   **For a sensitive `email` column (data_type: text):**
            `"select_expression": "CASE WHEN current_user = 'admin' THEN \"email\" ELSE '***'::text END AS \"email\""`
        *   **For a sensitive `balance` column (data_type: numeric):**
            `"select_expression": "CASE WHEN current_user = 'admin' THEN \"balance\" ELSE 0::numeric END AS \"balance\""`
        *   **For a primary key `id` column (data_type: integer, classification: PK):**
            `"select_expression": "\"id\""`
        *   **For a non-sensitive `created_at` column (data_type: timestamp):**
            `"select_expression": "\"created_at\""`
        5. Output Response:-  - **Input:** A JSON object with a list of tables. The `table_name` key in the input JSON **should only contain the base name of the table** (e.g., "customers", NOT "public.customers"). 
        """
        user_prompt_data = [table.model_dump() for table in params.classification_results]
        user_prompt = f"Generate the JSON masking plan for this classification:\n{json.dumps(user_prompt_data, indent=2)}"
        
        response_json_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        logger.info(f"Raw masking plan response from AI: {response_json_str}")
        
        llm_data = json.loads(response_json_str)
        validated_plan = models.LLMResponseModel.model_validate(llm_data)
        
        final_statements = []
        for table_plan in validated_plan.tables:
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

    except json.JSONDecodeError as e:
        logger.error(f"LLM returned non-JSON response: {e}\nRaw Response: {response_json_str}")
        raise HTTPException(
            status_code=502,
            detail="The AI agent returned a malformed response that could not be parsed as JSON."
        )
    except ValidationError as e:
        logger.error(f"LLM response failed validation: {e}\nRaw Data: {llm_data}")
        raise HTTPException(
            status_code=502,
            detail=f"The AI agent returned data in an unexpected format. Validation errors: {e}"
        )
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/apply_masking_plan", response_model=models.ApplyPlanResponse)
async def apply_masking_plan(params: models.ApplyMaskingRequest, settings: Settings = Depends(get_settings)):
    try:
        if not params.sql_statements:
            raise HTTPException(status_code=400, detail="No SQL statements provided to apply.")

        conn_str = _get_conn_str(params.connection_string, settings)
        await db_service.execute_statements(conn_str, params.sql_statements)
        
        statement_count = len(params.sql_statements)
        return models.ApplyPlanResponse(
            message=f"Successfully applied {statement_count} SQL statement(s) to the database."
        )
        
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

@router.post("/list-governed-views", response_model=models.ListViewsResponse)
async def list_governed_views(params: models.DBParams, settings: Settings = Depends(get_settings)):
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        logger.info(f"Listing governed views for connection.")
        
        view_list = await db_service.list_governed_views(conn_str)
        
        return models.ListViewsResponse(governed_views=view_list)

    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error listing views: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")


@router.post("/fetch-view-data", response_model=models.FetchViewDataResponse)
async def fetch_governed_view_data(
    # The 'params' object now automatically includes the 'role' field
    # thanks to our change in models.py.
    params: models.FetchViewDataRequest, 
    settings: Settings = Depends(get_settings)
):
    """
    Fetches paginated data from a specified governed view, assuming a specific
    database role for the duration of the query.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        view_name = params.view_name
        
        if not view_name.endswith('_governed_view'):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid view name. Only views ending in '_governed_view' can be queried by this endpoint."
            )
        
        # Add a log message to show which role is being used for the query.
        logger.info(f"Fetching data from view '{view_name}' as role '{params.role}' with limit {params.limit}, offset {params.offset}.")
        
        # Pass the new 'role' parameter to the service function call.
        data_rows = await db_service.fetch_view_data(
            conn_str=conn_str,
            view_name=view_name,
            limit=params.limit,
            offset=params.offset,
            role=params.role  
        )
        
        return models.FetchViewDataResponse(
            view_name=view_name,
            row_count=len(data_rows),
            data=data_rows
        )

    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error fetching view data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")
    
@router.post("/download/governance-report/excel", response_class=StreamingResponse)
async def download_governance_report_excel(params: models.DownloadGovernanceReportRequest):
    try:
        relationships_df = pd.DataFrame([item.model_dump() for item in params.referential_integrity.relationship_explanations])
        foundational_df = pd.DataFrame([item.model_dump() for item in params.referential_integrity.foundational_tables])
        sql_df = pd.DataFrame(params.masking_sql.sql_statements, columns=["SQL Masking Statement"])

        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            relationships_df.to_excel(writer, sheet_name='Referential Integrity', index=False)
            foundational_df.to_excel(writer, sheet_name='Foundational Tables', index=False)
            sql_df.to_excel(writer, sheet_name='Masking SQL Plan', index=False)
        
        buffer.seek(0)
        headers = {'Content-Disposition': 'attachment; filename=Data_Governance_Report.xlsx'}
        return StreamingResponse(buffer, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers=headers)
    except Exception as e:
        logger.error(f"Failed to generate Excel report: {e}")
        raise HTTPException(status_code=500, detail="Could not generate Excel file.")


@router.post("/download/governance-report/word", response_class=StreamingResponse)
async def download_governance_report_word(params: models.DownloadGovernanceReportRequest):
    try:
        document = docx.Document()
        document.add_heading('Data Governance Report', level=0)
        
        document.add_heading('Data Relationships (Referential Integrity)', level=1)
        for item in params.referential_integrity.relationship_explanations:
            document.add_paragraph(f"Rule: Every entry in `{item.from_table}` must correspond to an entry in `{item.to_table}`.", style='Intense Quote')
            document.add_paragraph(f"Business Context: {item.business_rule}")
            document.add_paragraph(f"Impact of Change: {item.impact_of_change}\n")
        
        document.add_heading('Foundational Data Tables', level=1)
        for item in params.referential_integrity.foundational_tables:
            p = document.add_paragraph()
            p.add_run('Table: ').bold = True
            p.add_run(item.table_name).bold = True
            document.add_paragraph(f"Business Role: {item.business_role}")
            document.add_paragraph(f"Impact of Change: {item.impact_of_change}\n")

        document.add_heading('Data Masking SQL Plan', level=1)
        full_sql_script = ";\n\n".join(params.masking_sql.sql_statements) + ";"
        document.add_paragraph(full_sql_script)
        
        buffer = io.BytesIO()
        document.save(buffer)
        buffer.seek(0)
        headers = {'Content-Disposition': 'attachment; filename=Data_Governance_Report.docx'}
        return StreamingResponse(buffer, media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document', headers=headers)
    except Exception as e:
        logger.error(f"Failed to generate Word report: {e}")
        raise HTTPException(status_code=500, detail="Could not generate Word file.")
    
@router.delete("/views", response_model=models.DeleteResponse)
async def delete_all_views(params: models.DBParams, settings: Settings = Depends(get_settings)):
    """
    Deletes all user-defined views from the public schema of the database.
    
    This is a destructive operation and cannot be undone.
    """
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        
        # Delegate the actual deletion logic to the db_service
        deleted_count = await db_service.delete_all_views(conn_str)
        
        if deleted_count == 0:
            return models.DeleteResponse(message="No views found to delete.", deleted_count=0)
            
        return models.DeleteResponse(
            message=f"Successfully deleted {deleted_count} views.",
            deleted_count=deleted_count
        )

    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error deleting views: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected server error occurred.")