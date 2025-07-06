# File: app/api/routers/talktoDb.py

import logging
import json
import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException

# Import all necessary services and models
from app.api import models as schemas
from app.services import db_service, llm_service
from app.services.errors import DatabaseServiceError, LLMServiceError
from app.services.data_governance_service import DataGovernanceService, get_governance_service
from app.agents.contracts import TableClassificationContract

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/talk-to-db",
    tags=["Talk to Database"]
)

@router.post(
    "/query",
    response_model=schemas.NaturalLanguageQueryResponse,
    summary="Generates and executes a SQL query from natural language, with data governance checks."
)
async def generate_and_run_sql(
    request: schemas.NaturalLanguageQueryRequest,
    db: db_service.DatabaseService = Depends(db_service.get_db_service),
    llm: llm_service.LLMService = Depends(llm_service.get_llm_service),
    gov_service: DataGovernanceService = Depends(get_governance_service)
):
    """
    Provides a complete, end-to-end flow for safely converting a natural
    language question into an executable SQL query. This endpoint demonstrates
    agent-to-agent communication by consulting the Data Governance agent
    before executing any query that might access sensitive data.
    """
    conn_str = str(request.connection_string)
    
    try:
        # Step 1: Get schema and generate the initial, potentially unsafe SQL
        schema_representation = await db.get_schema_representation(conn_str=conn_str)
        system_prompt = f"You are a SQL expert... Use this schema: {schema_representation}" # Abridged for clarity
        user_prompt = request.prompt
        raw_sql = await llm.call_llm(system_prompt=system_prompt, user_prompt=user_prompt)
        logger.info(f"LLM generated initial SQL: {raw_sql[:250]}...")

        # === AGENT-TO-AGENT PROTOCOL STARTS HERE ===
        logger.info("Consulting Data Governance Agent for security check...")

        # Step 2: Request classification contract from the Governance Agent
        full_schema_dict = await db.extract_db_schema(conn_str)
        schema_obj = schemas.ExtractedSchema.model_validate(full_schema_dict)
        classification_contracts: List[TableClassificationContract] = await gov_service.get_classification_contract(schema_obj)
        
        # Create a unified set of all sensitive columns across all tables
        sensitive_columns = {
            col.column_name
            for table_contract in classification_contracts
            for col in table_contract.columns if col.is_sensitive
        }
        
        # Step 3: Check if the generated SQL touches sensitive columns
        queried_columns = set(re.findall(r'SELECT.*?"(\w+)"', raw_sql, re.IGNORECASE | re.DOTALL))
        
        final_sql_to_execute = raw_sql
        safety_warning = None

        if any(col in sensitive_columns for col in queried_columns):
            sensitive_queried = queried_columns.intersection(sensitive_columns)
            logger.warning(f"Sensitive data access detected. Columns: {sensitive_queried}")
            
            table_match = re.search(r'FROM\s+"(public)"\."([^"]+)"', raw_sql, re.IGNORECASE)
            if table_match:
                table_name = table_match.group(2)
                governed_view_name = f"{table_name}_governed_view"

                # Step 4: Apply the safety protocol
                if await db.view_exists(conn_str, governed_view_name):
                    # Redirect to the safe, governed view if it exists
                    final_sql_to_execute = raw_sql.replace(f'"public"."{table_name}"', f'"public"."{governed_view_name}"')
                    safety_warning = f"Sensitive data detected. Results are being masked by the '{governed_view_name}' governance policy."
                    logger.info(f"Redirecting query to safe view: '{governed_view_name}'")
                else:
                    # Block the query if no safe view is available
                    raise LLMServiceError(
                        status_code=403, # Forbidden
                        message="Query blocked. This query accesses sensitive PII data, and no protective data governance view exists for this table."
                    )
        
        # Step 5: Execute the final, safe SQL query
        logger.info(f"Executing final, safe SQL: {final_sql_to_execute[:250]}...")
        execution_result = await db.execute_query(conn_str=conn_str, sql_query=final_sql_to_execute)

        return schemas.NaturalLanguageQueryResponse(
            generated_sql=raw_sql, # Always show the user the original SQL they intended
            safety_warning=safety_warning,
            **execution_result
        )

    except (DatabaseServiceError, LLMServiceError) as e:
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=getattr(e, 'message', str(e)))
    except Exception as e:
        logger.exception("An unexpected internal error occurred in the talk-to-db endpoint.")
        raise HTTPException(status_code=500, detail="An unexpected internal server error occurred.")