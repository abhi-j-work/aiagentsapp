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




# ===================================================================
# Models for Data Profiling
# ===================================================================

class GenerateDataProfileRequest(BaseModel):
    """Request model for generating a data profile for a table."""
    table_name: str = Field(..., description="The name of the table to profile.", example="users")
    connection_string: Optional[str] = Field(
        None, 
        description="Optional database connection string. If not provided, the server's configured default will be used.",
        example="postgresql://user:password@host:port/database"
    )

class ColumnProfile(BaseModel):
    """Detailed statistical profile for a single column."""
    column_name: str = Field(..., description="Name of the database column.")
    data_type: str = Field(..., description="Data type of the column.")
    
    # General stats
    total_values: int = Field(..., description="Total number of rows in the table.")
    null_count: int = Field(..., description="Number of NULL values in this column.")
    null_percentage: float = Field(..., description="Percentage of NULL values (0.0 to 1.0).")
    distinct_count: int = Field(..., description="Number of distinct values in this column.")
    distinct_percentage: float = Field(..., description="Percentage of distinct values (0.0 to 1.0).")

    # Numeric stats (optional)
    min_value: Optional[float] = Field(None, description="Minimum value for numeric columns.")
    max_value: Optional[float] = Field(None, description="Maximum value for numeric columns.")
    avg_value: Optional[float] = Field(None, description="Average value for numeric columns.")
    std_dev: Optional[float] = Field(None, description="Standard deviation for numeric columns.")
    
    # Text stats (optional)
    min_length: Optional[int] = Field(None, description="Minimum length for text columns.")
    max_length: Optional[int] = Field(None, description="Maximum length for text columns.")
    avg_length: Optional[float] = Field(None, description="Average length for text columns.")

    # Datetime stats (optional)
    earliest_date: Optional[str] = Field(None, description="Earliest date/timestamp for date columns.")
    latest_date: Optional[str] = Field(None, description="Latest date/timestamp for date columns.")

class GenerateDataProfileResponse(BaseModel):
    """Response model containing the data profile for a table."""
    table_name: str = Field(..., description="The name of the profiled table.")
    column_profiles: List[ColumnProfile] = Field(..., description="A list of profiles for each column in the table.")


# ===================================================================
# Models for Quality Plan Generation
# ===================================================================

class GenerateQualityPlanRequest(BaseModel):
    """Request model for generating a data quality plan."""
    table_name: str = Field(..., description="The name of the table to analyze.", example="users")
    connection_string: Optional[str] = Field(
        None, 
        description="Optional database connection string. If not provided, the server's configured default will be used.",
        example="postgresql://user:password@host:port/database"
    )

class ProposedQualityCheck(BaseModel):
    """A single data quality check proposed by the AI agent."""
    check_id: str = Field(..., description="A unique, machine-friendly identifier for the check.", example="check_null_emails")
    rule_name: str = Field(..., description="A human-readable name for the quality rule.", example="Check for Null Emails")
    rule_description: str = Field(..., description="A clear explanation of what the rule checks for.", example="Ensures that the email column does not contain any NULL values.")
    check_sql: str = Field(..., description="The PostgreSQL query to execute the check, which counts violating rows.", example='SELECT COUNT(*) FROM "users" WHERE "email" IS NULL;')

class GenerateQualityPlanResponse(BaseModel):
    """Response model containing the proposed data quality plan."""
    table_name: str = Field(..., description="The name of the table for which the plan was generated.")
    proposed_checks: List[ProposedQualityCheck] = Field(..., description="A list of recommended data quality checks.")


# ===================================================================
# Models for Quality Check Execution
# ===================================================================

class ExecuteQualityChecksRequest(BaseModel):
    """Request model for executing a set of data quality checks."""
    table_name: str = Field(..., description="The name of the table to run checks against.", example="users")
    connection_string: Optional[str] = Field(
        None, 
        description="Optional database connection string. If not provided, the server's configured default will be used.",
        example="postgresql://user:password@host:port/database"
    )
    checks_to_run: List[ProposedQualityCheck] = Field(..., description="The list of quality checks to be executed.")

class ValidationResult(BaseModel):
    """The result of executing a single data quality check."""
    check_id: str = Field(..., description="The unique identifier of the check that was run.")
    rule_name: str = Field(..., description="The human-readable name of the rule.")
    is_valid: bool = Field(..., description="True if the check passed (0 violating rows), False otherwise.")
    invalid_count: int = Field(..., description="The number of rows that violated the data quality rule.")
    total_rows: int = Field(..., description="The total number of rows in the table when the check was run.")
    check_query: str = Field(..., description="The SQL query that was executed for this check.")

class ExecuteQualityChecksResponse(BaseModel):
    """The final report after executing all requested data quality checks."""
    table_name: str = Field(..., description="The name of the table that was validated.")
    validation_results: List[ValidationResult] = Field(..., description="A list of results for each executed check.")


class AIColumnProfile(BaseModel):
    column_name: str
    inferred_type: str
    assumptions_about_data: str
    potential_quality_risks: str
    common_patterns_or_values: str

class GenerateDataProfileRequest(BaseModel):
    connection_string: Optional[str]
    table_name: str

class GenerateDataProfileResponse(BaseModel):
    table_name: str
    columns: List[AIColumnProfile]
