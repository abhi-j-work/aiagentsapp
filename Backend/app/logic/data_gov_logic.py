import logging
from typing import Optional, List
from fastapi import HTTPException

from app.core.config import Settings
from app.api import models

logger = logging.getLogger(__name__)

def get_conn_str(provided_str: Optional[str], settings: Settings) -> str:
    # ... (this function is correct) ...
    conn_str = provided_str or settings.DATABASE_URL
    if not conn_str:
        raise HTTPException(status_code=400, detail="DB connection string not provided and not configured on server.")
    return conn_str

def clean_classification_data(llm_data: dict, original_schema: models.ExtractedSchema) -> dict:
    # ... (this function is correct) ...
    if "classification_results" not in llm_data or not isinstance(llm_data["classification_results"], list):
        return llm_data
    cleaned_results = []
    for table_data in llm_data["classification_results"]:
        if "table" in table_data and "table_name" not in table_data:
            table_data["table_name"] = table_data.pop("table")
        table_name = table_data.get("table_name")
        if not table_name or "columns" not in table_data: continue
        original_table = original_schema.tables.get(table_name)
        if not original_table: continue
        dtype_lookup = {col.column_name: col.data_type for col in original_table.columns}
        cleaned_columns = []
        for column_data in table_data["columns"]:
            col_name = column_data.get("column_name")
            if not col_name: continue
            if "data_type" not in column_data:
                column_data["data_type"] = dtype_lookup.get(col_name, "UNKNOWN")
            cleaned_columns.append(column_data)
        table_data["columns"] = cleaned_columns
        cleaned_results.append(table_data)
    llm_data["classification_results"] = cleaned_results
    return llm_data

def clean_masking_plan(llm_data: dict, original_classification: List[models.ClassifiedTable]) -> dict:
    # ... (this function is correct) ...
    if "tables" not in llm_data or not isinstance(llm_data["tables"], list):
        return llm_data
    new_tables_list = []
    for classified_table, llm_table_output in zip(original_classification, llm_data["tables"]):
        if not isinstance(llm_table_output, dict) or "select" not in llm_table_output:
            continue
        select_expressions = llm_table_output["select"]
        new_columns_list = []
        for original_column, select_expr in zip(classified_table.columns, select_expressions):
            new_columns_list.append({"column_name": original_column.column_name, "select_expression": select_expr})
        new_tables_list.append({"table_name": classified_table.table_name, "columns": new_columns_list})
    llm_data["tables"] = new_tables_list
    return llm_data