# File: app/api/routers/data_governance_router.py

import logging
import json
import io
from typing import Optional

# Imports for file generation
import pandas as pd
import docx

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.api import models
from app.services import db_service, evaluation_service, llm_service, notification
from app.services.errors import DatabaseServiceError, LLMServiceError

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
        
        all_table_names = list(validated_schema.tables.keys())
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
        raw_response = locals().get('response_json_str', 'N/A')
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
        You are an expert data privacy and governance analyst... 
        """ # Omitted for brevity
        user_prompt = f"Classify the columns in this schema:\n{json.dumps(schema_to_classify.model_dump(), indent=2)}"
        
        response_json_str = await llm_service_instance.call_llm(
            system_prompt, user_prompt, response_format={"type": "json_object"}
        )
        
        classification_report = models.ClassificationResponse.model_validate_json(response_json_str)
        
        # --- ROBUST EVALUATION FIX ---
        logger.info("Evaluating generated classification with LLM Judge...")
        evaluation_result_dict = await evaluation_service.judge_data_classification(
            schema_str=json.dumps(schema_to_classify.model_dump(mode='json'), indent=2),
            classification_results=classification_report.model_dump(mode='json')["classification_results"]
        )
        
        try:
            validated_evaluation = models.EvaluationResult.model_validate(evaluation_result_dict)
        except ValidationError as e:
            logger.error(f"LLM Judge returned an invalid evaluation structure: {e}. Raw data: {evaluation_result_dict}")
            validated_evaluation = models.EvaluationResult(
                is_safe=False, is_relevant=False, score=0, reasoning=f"LLM Judge returned malformed data: {e}"
            )
        
        classification_report.evaluation = validated_evaluation
        # --- END OF FIX ---

        try:
            await notification.send_data_classification_alert(classification_report)
        except Exception as e:
            logger.error(f"Failed to send data classification notification: {e}")
        
        return classification_report

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
        You are a meticulous, senior PostgreSQL database administrator...
        """ # Omitted for brevity
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
        logger.error(f"LLM returned non-JSON response: {e}\nRaw Response: {locals().get('response_json_str', 'N/A')}")
        raise HTTPException(status_code=502, detail="The AI agent returned a malformed response.")
    except ValidationError as e:
        logger.error(f"LLM response failed validation: {e}\nRaw Data: {locals().get('llm_data', 'N/A')}")
        raise HTTPException(status_code=502, detail=f"The AI agent returned data in an unexpected format: {e}")
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/apply_masking_plan", response_model=models.ApplyPlanResponse)
async def apply_masking_plan(params: models.ApplyMaskingRequest, settings: Settings = Depends(get_settings)):
    try:
        if not params.sql_statements:
            raise HTTPException(status_code=400, detail="No SQL statements provided to apply.")
        conn_str = _get_conn_str(params.connection_string, settings)
        await db_service.execute_statements(conn_str, params.sql_statements)
        return models.ApplyPlanResponse(message=f"Successfully applied {len(params.sql_statements)} SQL statement(s).")
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

@router.post("/list-governed-views", response_model=models.ListViewsResponse)
async def list_governed_views(params: models.DBParams, settings: Settings = Depends(get_settings)):
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        view_list = await db_service.list_governed_views(conn_str)
        return models.ListViewsResponse(governed_views=view_list)
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

@router.post("/fetch-view-data", response_model=models.FetchViewDataResponse)
async def fetch_governed_view_data(params: models.FetchViewDataRequest, settings: Settings = Depends(get_settings)):
    try:
        conn_str = _get_conn_str(params.connection_string, settings)
        view_name = params.view_name
        if not view_name.endswith('_governed_view'):
            raise HTTPException(status_code=400, detail="Invalid view name.")
        data_rows = await db_service.fetch_view_data(
            conn_str=conn_str, view_name=view_name, limit=params.limit, offset=params.offset, role=params.role)
        return models.FetchViewDataResponse(view_name=view_name, row_count=len(data_rows), data=data_rows)
    except DatabaseServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# --- NEW DOWNLOAD ENDPOINTS ---

@router.post("/download/governance-report/excel", response_class=StreamingResponse)
async def download_governance_report_excel(params: models.DownloadGovernanceReportRequest):
    """
    Generates and streams a multi-sheet Excel report containing referential
    integrity, foundational tables, and the SQL masking plan.
    """
    try:
        # Create DataFrames from the input data
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
    """
    Generates and streams a Word document report containing referential
    integrity, foundational tables, and the SQL masking plan.
    """
    try:
        document = docx.Document()
        document.add_heading('Data Governance Report', level=0)

        # --- Referential Integrity Section ---
        document.add_heading('Data Relationships (Referential Integrity)', level=1)
        for item in params.referential_integrity.relationship_explanations:
            p = document.add_paragraph()
            p.add_run('Rule: ').bold = True
            p.add_run(f'Every entry in `{item.from_table}` must correspond to an entry in `{item.to_table}`.')
            p = document.add_paragraph()
            p.add_run('Business Context: ').bold = True
            p.add_run(item.business_rule)
            p = document.add_paragraph()
            p.add_run('Impact of Change: ').bold = True
            p.add_run(item.impact_of_change)
            document.add_paragraph() 

        # --- Foundational Tables Section ---
        document.add_heading('Foundational Data Tables', level=1)
        for item in params.referential_integrity.foundational_tables:
            p = document.add_paragraph()
            p.add_run('Table: ').bold = True
            p.add_run(item.table_name).bold = True
            p = document.add_paragraph()
            p.add_run('Business Role: ').bold = True
            p.add_run(item.business_role)
            p = document.add_paragraph()
            p.add_run('Impact of Change: ').bold = True
            p.add_run(item.impact_of_change)
            document.add_paragraph()

        # --- SQL Masking Plan Section ---
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