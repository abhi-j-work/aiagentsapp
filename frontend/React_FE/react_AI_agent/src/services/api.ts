// ====================================================================
// API CLIENT SETUP
// ====================================================================

// For production, use environment variables: const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = 'http://localhost:1057';

/**
 * A robust, standardized function for making JSON API requests.
 * @param endpoint The API endpoint path (e.g., '/data-gov/schema').
 * @param options Standard RequestInit options (method, body, etc.).
 * @returns A promise that resolves with the JSON response data.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanBase = API_BASE_URL.trim().replace(/\/$/, '');
    const cleanEndpoint = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`;
    const finalUrl = `${cleanBase}${cleanEndpoint}`;
    
    try {
        const response = await fetch(finalUrl, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
                detail: `Request to ${finalUrl} failed with HTTP status ${response.status}` 
            }));
            throw new Error(errorData.detail);
        }
        
        // Handle cases where the response might be empty (e.g., a 204 No Content status)
        const text = await response.text();
        return text ? JSON.parse(text) : ({} as T);

    } catch (error: any) {
        console.error(`API request to ${finalUrl} failed:`, error);
        throw new Error(error.message || 'A network error occurred. Ensure the backend server is running and accessible.');
    }
}

/**
 * A helper function to stream a file from the backend and trigger a browser download.
 * @param endpoint The API endpoint for the download.
 * @param body The request body to send.
 * @param filename The desired name for the downloaded file.
 */
async function streamDownload(endpoint: string, body: any, filename: string): Promise<void> {
    const cleanBase = API_BASE_URL.trim().replace(/\/$/, '');
    const cleanEndpoint = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`;
    const finalUrl = `${cleanBase}${cleanEndpoint}`;

    try {
        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: `Download request to ${finalUrl} failed with HTTP status ${response.status}`
            }));
            throw new Error(errorData.detail);
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        
        window.URL.revokeObjectURL(downloadUrl);
        link.remove();

    } catch (error: any) {
        console.error(`File download from ${finalUrl} failed:`, error);
        alert(`Failed to download file: ${error.message}`);
    }
}


// ====================================================================
// 1. DATA GOVERNANCE AGENT
// ====================================================================

// --- Types ---
export interface ExtractedSchema {
  tables: { [tableName: string]: { columns: { column_name: string; data_type: string }[] } };
  foreign_keys: any[];
}
export interface ReferentialIntegrityResponse {
  relationship_explanations: { from_table: string; to_table: string; business_rule: string; impact_of_change: string }[];
  foundational_tables: { table_name: string; business_role: string; impact_of_change: string }[];
}
export interface ClassificationResult {
  table_name: string;
  columns: { column_name: string; data_type: string; classification: string; reasoning: string }[];
}
export interface SQLGenerationResponse {
  sql_statements: string[];
  message: string;
}
export interface DownloadGovernanceReportRequest {
  referential_integrity: ReferentialIntegrityResponse;
  masking_sql: SQLGenerationResponse;
}
export type ListViewsResponse = { governed_views: string[] };
export type FetchViewDataResponse = { view_name: string; row_count: number; data: Record<string, any>[] };

// --- API Functions ---
/** Extracts the schema from a given database. */
export const postExtractSchema = (connection_string: string) =>
  request<{ schema_data: ExtractedSchema }>('/data-gov/schema', {
    method: 'POST',
    body: JSON.stringify({ connection_string }),
  });

/** Analyzes and explains referential integrity in a business-friendly format. */
export const postExplainIntegrity = (connection_string: string) =>
  request<ReferentialIntegrityResponse>('/data-gov/explain_referential_integrity', {
    method: 'POST',
    body: JSON.stringify({ connection_string }),
  });

/** Classifies each column in the database schema into sensitivity levels. */
export const postClassifyData = (schema_data: ExtractedSchema) =>
  request<{ classification_results: ClassificationResult[] }>('/data-gov/classify_data', {
    method: 'POST',
    body: JSON.stringify({ schema_data }),
  });

/** Generates SQL statements to create views that mask sensitive data. */
export const postGenerateMaskingSQL = (classification_results: ClassificationResult[]) =>
  request<SQLGenerationResponse>('/data-gov/generate_masking_sql', {
    method: 'POST',
    body: JSON.stringify({ classification_results }),
  });

/** Executes the generated SQL masking plan against the database. */
export const postApplyMaskingPlan = (connection_string: string, sql_statements: string[]) =>
  request<{ message: string }>('/data-gov/apply_masking_plan', {
    method: 'POST',
    body: JSON.stringify({ connection_string, sql_statements }),
  });

/** Lists all governed views in the database. */
export const postListGovernedViews = (connectionString: string) =>
  request<ListViewsResponse>('/data-gov/list-governed-views', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString }),
  });

/** Fetches paginated data from a specified governed view. */
export const postFetchViewData = (connectionString: string, viewName: string, role: string, limit = 50) =>
  request<FetchViewDataResponse>('/data-gov/fetch-view-data', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString, view_name: viewName, role: role, limit: limit, offset: 0 }),
  });

/** Downloads the full governance report as a Word document. */
export const downloadWordReport = (data: DownloadGovernanceReportRequest) =>
    streamDownload('/data-gov/download/governance-report/word', data, 'Data_Governance_Report.docx');


// ====================================================================
// 2. DATA LINEAGE AGENT
// ====================================================================

// --- Types ---
export interface LineageNode { id: string; type: 'table' | 'view'; label: string }
export interface LineageEdge { source: string; target: string }
export interface LineageResponse { nodes: LineageNode[]; edges: LineageEdge[] }
export interface DatabaseObjectsResponse { tables: string[]; views: string[] }

// --- API Functions ---
/** Fetches the lineage (source tables) for a specific database object. */
export const postGetDataLineage = (connectionString: string, objectName: string) =>
  request<LineageResponse>('/data/lineage', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString, object_name: objectName }),
  });

/** Lists all user-defined tables and views from the public schema. */
export const postListDatabaseObjects = (connectionString: string) =>
  request<DatabaseObjectsResponse>('/data/list-database-objects', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString }),
  });


// ====================================================================
// 3. TALK TO DB AGENT
// ====================================================================

// --- Types ---
export interface TalkToDbRequest { connection_string: string; prompt: string }
export interface TalkToDbEvaluationResult { is_safe: boolean; is_relevant: boolean; reasoning: string; score: number }
export interface TalkToDbResponse {
  generated_sql: string;
  data?: Record<string, any>[];
  message?: string;
  safety_warning?: string | null;
  evaluation?: TalkToDbEvaluationResult | null;
}

// --- API Functions ---
/** Sends a natural language prompt to be converted into a SQL query. */
export const postTalkToDbQuery = (params: TalkToDbRequest) =>
    request<TalkToDbResponse>('/talk-to-db/query', {
        method: 'POST',
        body: JSON.stringify(params),
    });


// ====================================================================
// 4. DATA QUALITY AGENT
// ====================================================================

// --- Types ---
export interface ColumnProfile {
    column_name: string; data_type: string; total_values: number; null_count: number; null_percentage: number;
    distinct_count: number; distinct_percentage: number; min_value?: number | null; max_value?: number | null;
    avg_value?: number | null; std_dev?: number | null; min_length?: number | null; max_length?: number | null;
    avg_length?: number | null; earliest_date?: string | null; latest_date?: string | null;
}
export interface GenerateDataProfileResponse {
    columns: any; table_name: string; column_profiles: ColumnProfile[] 
}
export interface ProposedQualityCheck { check_id: string; rule_name: string; rule_description: string; check_sql: string }
export interface DQEvaluationResult { score: number; reasoning: string }
export interface GenerateQualityPlanResponse {
    table_name: string;
    proposed_checks: ProposedQualityCheck[];
    // These fields were added from a different version of the type definition
    data_profile?: { total_rows: number; columns: any[] }; // Use more specific types if known
    semantic_profile?: { column_name: string; inferred_semantic_type: string; description: string; potential_issues_summary: string }[] | null;
    evaluation?: DQEvaluationResult | null;
}
export interface ValidationResult { check_id: string; rule_name: string; is_valid: boolean; invalid_count: number; total_rows: number; check_query: string }
export interface ExecuteQualityChecksResponse { table_name: string; validation_results: ValidationResult[] }

// --- API Functions ---
/** Generates a statistical profile for all columns in a given table. */
export const postGenerateDataProfile = (connection_string: string, table_name: string) =>
  request<GenerateDataProfileResponse>('/data-quality/generate-profile', {
    method: 'POST',
    body: JSON.stringify({ connection_string, table_name }),
  });

/** Generates a set of data quality checks based on the table's schema and custom rules. */
export const postGenerateQualityPlan = (connectionString: string, tableName: string, customRules: string) =>
  request<GenerateQualityPlanResponse>('/data-quality/generate-quality-plan', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString, table_name: tableName, custom_rules: customRules }),
  });

/** Executes a list of data quality checks against the database. */
export const postExecuteQualityChecks = (connection_string: string, table_name: string, checks_to_run: ProposedQualityCheck[]) =>
  request<ExecuteQualityChecksResponse>('/data-quality/execute-quality-checks', {
    method: 'POST',
    body: JSON.stringify({ connection_string, table_name, checks_to_run }),
  });


// ====================================================================
// 5. EVALUATION AGENT
// ====================================================================

// --- Types ---
export interface AgentEvaluationSummary { agent: string; status: string; average_score: number; total_prompts: number }
export interface TalkToDbDetailedResult { prompt: string; status: string; generated_sql: string | null; golden_sql: string; score: number; reasoning: string; latency_ms: number }
export interface AgentTaskDetailedResult { prompt: string; status: string; score: number; reasoning: string; latency_ms: number }
export interface FullEvaluationReport {
  summary_report: AgentEvaluationSummary[];
  detailed_results: { talk_to_db: TalkToDbDetailedResult[]; data_quality: AgentTaskDetailedResult[]; data_governance: AgentTaskDetailedResult[] };
}

// --- API Functions ---
/** Triggers a full evaluation run for all agents and fetches the report. */
export const postRunAllEvaluations = () =>
    request<FullEvaluationReport>('/evaluation/run-all', {
        method: 'POST',
    });