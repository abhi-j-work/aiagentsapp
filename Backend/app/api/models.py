from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field,PostgresDsn
from typing import List
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


class ApplyMaskingRequest(BaseModel):
    connection_string: Optional[str] = Field(
        None,
        description="Database connection string. If not provided, the server's configured URL will be used."
    )
    sql_statements: List[str] = Field(
        ...,
        description="The list of SQL statements (e.g., CREATE VIEW...) to be executed."
    )

# This is the OUTPUT of our new endpoint.
class ApplyPlanResponse(BaseModel):
    status: str = "success"
    message: str


class RelationshipExplanation(BaseModel):
    from_table: str
    to_table: str
    business_rule: str
    impact_of_change: str

class FoundationalTable(BaseModel):
    table_name: str
    business_role: str
    impact_of_change: str

class ReferentialIntegrityResponse(BaseModel):
    relationship_explanations: List[RelationshipExplanation]
    foundational_tables: List[FoundationalTable]

class NaturalLanguageQueryRequest(BaseModel):
    """
    Defines the request payload for the NLQ endpoint, using a connection string.
    """
    connection_string: PostgresDsn = Field(
        ...,
        example="postgresql://postgres:your_password@localhost:5432/mydatabase"
    )
    prompt: str = Field(
        ...,
        min_length=5,
        description="The natural language question to be converted to SQL."
    )

class NaturalLanguageQueryResponse(BaseModel):
    """Defines the successful response structure from the NLQ endpoint."""
    generated_sql: str
    data: List[Dict[str, Any]] | None = None
    message: str | None = None




class ListViewsResponse(BaseModel):
    """Response model for listing the governed views."""
    governed_views: List[str] = Field(..., description="A list of view names that match the governed view pattern.")

class FetchViewDataRequest(DBParams):
    """Request model for fetching data from a specific view."""
    view_name: str = Field(..., description="The name of the governed view to query.")
    limit: int = Field(default=100, gt=0, le=1000, description="Number of rows to return.")
    offset: int = Field(default=0, ge=0, description="Number of rows to skip for pagination.")
    role: str = Field(..., description="The database role to assume for this query (e.g., 'admin', 'analyst').") 

class FetchViewDataResponse(BaseModel):
    """Response model for returning data from a view."""
    view_name: str
    row_count: int = Field(..., description="The number of rows returned in this response.")
    data: List[Dict[str, Any]]


class GenerateQualityPlanRequest(DBParams):
    """Request to have the AI generate a plan of data quality checks."""
    table_name: str

class ProposedQualityCheck(BaseModel):
    """A single data quality check proposed by the AI."""
    check_id: str = Field(..., description="A unique, machine-friendly ID for the check (e.g., 'email_format_check').")
    rule_name: str = Field(..., description="A human-readable name for the rule.")
    rule_description: str = Field(..., description="A clear explanation of what the rule validates.")
    check_sql: str = Field(..., description="The executable SQL query to count records that VIOLATE this rule.")

class GenerateQualityPlanResponse(BaseModel):
    """The response from the plan generation endpoint, containing a list of proposed checks."""
    table_name: str
    proposed_checks: List[ProposedQualityCheck]


# --- Endpoint 2: Execute Checks ---

class CheckToExecute(BaseModel):
    """A single check selected by the user to be executed."""
    check_id: str
    rule_name: str
    check_sql: str

class ExecuteQualityChecksRequest(DBParams):
    """Request to execute a list of selected data quality checks."""
    table_name: str
    checks_to_run: List[CheckToExecute]

class ValidationResult(BaseModel):
    """The final validation result for a single, executed rule."""
    check_id: str
    rule_name: str
    is_valid: bool = Field(..., description="True if invalid_count is 0, otherwise False.")
    invalid_count: int = Field(..., description="The number of rows that failed this rule's validation.")
    total_rows: int = Field(..., description="The total number of rows in the table for context.")
    check_query: str = Field(..., description="The exact SQL query that was executed.")

class ExecuteQualityChecksResponse(BaseModel):
    """The final response from the check execution endpoint."""
    table_name: str
    validation_results: List[ValidationResult]