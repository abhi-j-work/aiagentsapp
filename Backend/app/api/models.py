from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

# =============================================================================
# Enums and Core Data Structures
# =============================================================================

class DataClassification(str, Enum):
    """Enumeration for data sensitivity levels."""
    PUBLIC = "Public/Non-Sensitive"
    INTERNAL_CONFIDENTIAL = "Internal/Confidential"
    PII = "PII"
    SENSITIVE = "Sensitive"

# --- New models for strongly-typing the extracted schema ---
# These models provide better type safety and code completion than using Dict[str, Any].

class ExtractedColumn(BaseModel):
    """Represents a single column extracted from the database."""
    column_name: str
    data_type: str

class ExtractedTable(BaseModel):
    """Represents a single table with its columns."""
    columns: List[ExtractedColumn]

class ExtractedForeignKey(BaseModel):
    """Represents a single foreign key relationship."""
    name: Optional[str] = None
    referencing_table: str
    referencing_columns: List[str]
    referenced_table: str
    referenced_columns: List[str]

class ExtractedSchema(BaseModel):
    """The root model for the entire extracted database schema."""
    tables: Dict[str, ExtractedTable]
    foreign_keys: List[ExtractedForeignKey]


# =============================================================================
# API Request and Response Models
# =============================================================================

# --- Base and Shared Models ---

class DBParams(BaseModel):
    """Base model for requests that need database connection details."""
    connection_string: Optional[str] = Field(
        None, description="Optional DB connection string. If null, uses a server-side default."
    )

class SimpleMessageResponse(BaseModel):
    """A generic response for simple status messages."""
    message: str


# --- Schema and Classification ---

class SchemaResponse(BaseModel):
    """Response model for returning an extracted database schema."""
    schema_data: ExtractedSchema

class ClassifiedColumn(BaseModel):
    """Represents a column after it has been classified."""
    column_name: str
    data_type: str
    classification: DataClassification
    reasoning: Optional[str] = Field(None, description="Explanation for the chosen classification.")

class ClassifiedTable(BaseModel):
    """Represents a table with its classified columns."""
    table_name: str
    columns: List[ClassifiedColumn]

class ClassificationRequest(DBParams):
    """Request model for classifying a database schema."""
    schema_data: Optional[ExtractedSchema] = Field(
        None, description="Optional schema to classify. If null, it will be extracted from the DB first."
    )

class ClassificationResponse(BaseModel):
    """Response model for returning the results of a schema classification."""
    classification_results: List[ClassifiedTable]


# --- SQL Generation, Application, and Masking ---

class LLMColumnDetail(BaseModel):
    column_name: str
    select_expression: str

class LLMTableDetail(BaseModel):
    table_name: str
    columns: List[LLMColumnDetail]

class ApplySQLRequest(DBParams):
    """Request model for applying one or more SQL statements to a database."""
    sql_statements: List[str]
    is_admin_action: bool = Field(
        False, description="A safety flag to confirm this privileged, schema-altering action."
    )

class SQLGenerationResponse(BaseModel):
    """Response model for returning generated SQL statements."""
    sql_statements: List[str]
    message: str

class MaskingRequest(BaseModel):
    """Request model for generating data masking rules or scripts."""
    classification_results: List[ClassifiedTable]


# --- Referential Integrity and View Analysis ---

class ReferentialIntegrityResponse(BaseModel):
    """Response model for an analysis of foreign key relationships."""
    explanation: str
    foreign_keys_found: List[ExtractedForeignKey] # Re-using the core model

class ViewDefinition(BaseModel):
    """Defines a database view for analysis."""
    view_name: str
    view_sql: str

class ViewAnalysisRequest(BaseModel):
    """Request model for analyzing the impact of a view on foreign keys."""
    view_def: ViewDefinition
    db_params: DBParams

class AnalysisResult(BaseModel):
    """Describes the impact on a single foreign key."""
    foreign_key_name: str
    impact_type: str = Field(..., description="One of: Preserved, Obscured, Broken, Not Applicable")
    reasoning: str

class ViewImpactAnalysisResponse(BaseModel):
    """The complete response for a view impact analysis."""
    view_name: str
    message: str
    analysis_results: List[AnalysisResult]

class ColumnPlan(BaseModel):
    select_expression: str = Field(..., description="The full SQL select expression for a column.")

class TablePlan(BaseModel):

    table_name: str = Field(..., description="The name of the table.")
    columns: List[ColumnPlan] = Field(..., description="The list of column expressions for the table.")

class LLMResponseModel(BaseModel):
    tables: List[TablePlan]