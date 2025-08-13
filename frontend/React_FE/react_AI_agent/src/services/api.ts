// ====================================================================
// API CLIENT SETUP
// ====================================================================

// For production, use environment variables: const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = 'http://localhost:1064';

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
export const postExtractSchema = (connection_string: string) =>
  request<{ schema_data: ExtractedSchema }>('/data-gov/schema', {
    method: 'POST',
    body: JSON.stringify({ connection_string }),
  });

export const postExplainIntegrity = (connection_string: string) =>
  request<ReferentialIntegrityResponse>('/data-gov/explain_referential_integrity', {
    method: 'POST',
    body: JSON.stringify({ connection_string }),
  });

export const postClassifyData = (schema_data: ExtractedSchema) =>
  request<{ classification_results: ClassificationResult[] }>('/data-gov/classify_data', {
    method: 'POST',
    body: JSON.stringify({ schema_data }),
  });

export const postGenerateMaskingSQL = (classification_results: ClassificationResult[]) =>
  request<SQLGenerationResponse>('/data-gov/generate_masking_sql', {
    method: 'POST',
    body: JSON.stringify({ classification_results }),
  });

export const postApplyMaskingPlan = (connection_string: string, sql_statements: string[]) =>
  request<{ message: string }>('/data-gov/apply_masking_plan', {
    method: 'POST',
    body: JSON.stringify({ connection_string, sql_statements }),
  });

export const postListGovernedViews = (connectionString: string) =>
  request<ListViewsResponse>('/data-gov/list-governed-views', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString }),
  });

export const postFetchViewData = (connectionString: string, viewName: string, role: string, limit = 50) =>
  request<FetchViewDataResponse>('/data-gov/fetch-view-data', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString, view_name: viewName, role: role, limit: limit, offset: 0 }),
  });

export const downloadWordReport = (data: DownloadGovernanceReportRequest) =>
    streamDownload('/data-gov/download/governance-report/word', data, 'Data_Governance_Report.docx');


// ====================================================================
// 2. DATA LINEAGE AGENT
// ====================================================================

// --- Types ---
export interface LineageNode { id: string; type: 'table' | 'view'; label: string }
export interface LineageEdge { source: string; target: string }
export interface LineageResponse { nodes: LineageNode[]; edges: LineageEdge[] }

export interface TableInfo { name: string; primary_key: string | null }
export interface DatabaseObjectsResponse { tables: TableInfo[]; views: string[] }

// --- API Functions ---
export const postGetDataLineage = (connectionString: string, objectName: string) =>
  request<LineageResponse>('/data/lineage', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString, object_name: objectName }),
  });

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
export const postTalkToDbQuery = (params: TalkToDbRequest) =>
    request<TalkToDbResponse>('/talk-to-db/query', {
        method: 'POST',
        body: JSON.stringify(params),
    });


// ====================================================================
// 4. DATA QUALITY AGENT
// ====================================================================

// --- Types ---
export interface AIColumnProfile {
    column_name: string;
    inferred_type: string;
    assumptions_about_data: string;
    potential_quality_risks: string;
    common_patterns_or_values: string;
}
export interface GenerateDataProfileResponse {
    table_name: string;
    columns: AIColumnProfile[];
}
export interface ProposedQualityCheck {
    check_id: string;
    rule_name: string;
    rule_description: string;
    check_sql: string;
}
export interface DQEvaluationResult {
    score: number;
    reasoning: string;
}
export interface GenerateQualityPlanResponse {
    table_name: string;
    proposed_checks: ProposedQualityCheck[];
    evaluation?: DQEvaluationResult | null;
}
export interface ValidationResult {
    check_id: string;
    rule_name: string;
    is_valid: boolean;
    invalid_count: number;
    total_rows: number;
    check_query: string;
}
export interface ExecuteQualityChecksResponse {
    table_name: string;
    validation_results: ValidationResult[];
}
export interface RemediationSQL {
    check_id: string;
    rule_name: string;
    remediation_sql: string;
}
export interface GenerateRemediationResponse {
    remediation_plan: RemediationSQL[];
}
export interface ApplyRemediationResponse {
    message: string;
    executed_statements: number;
}
export interface ListFilteredViewsResponse {
    filtered_views: string[];
}

// --- API Functions ---
export const postGenerateDataProfile = (connection_string: string, table_name: string) =>
  request<GenerateDataProfileResponse>('/data-quality/generate-profile', {
    method: 'POST',
    body: JSON.stringify({ connection_string, table_name }),
  });

export const postGenerateQualityPlan = (connectionString: string, tableName: string, customRules: string) =>
  request<GenerateQualityPlanResponse>('/data-quality/generate-quality-plan', {
    method: 'POST',
    body: JSON.stringify({ connection_string: connectionString, table_name: tableName, custom_rules: customRules }),
  });

export const postExecuteQualityChecks = (connection_string: string, table_name: string, checks_to_run: ProposedQualityCheck[]) =>
  request<ExecuteQualityChecksResponse>('/data-quality/execute-quality-checks', {
    method: 'POST',
    body: JSON.stringify({ connection_string, table_name, checks_to_run }),
  });

export const postGenerateRemediationSql = (connection_string: string, report: ExecuteQualityChecksResponse) =>
  request<GenerateRemediationResponse>('/data-quality/generate-remediation-sql', {
    method: 'POST',
    body: JSON.stringify({ 
        connection_string, 
        table_name: report.table_name, 
        validation_results: report.validation_results 
    }),
  });

export const postApplyRemediationPlan = (connection_string: string, plan: GenerateRemediationResponse) =>
  request<ApplyRemediationResponse>('/data-quality/apply-remediation-plan', {
    method: 'POST',
    body: JSON.stringify({ 
        connection_string, 
        remediation_plan: plan.remediation_plan 
    }),
  });

export const postListFilteredViews = (connection_string: string) =>
  request<ListFilteredViewsResponse>('/data-quality/list-filtered-views', {
    method: 'POST',
    body: JSON.stringify({ connection_string }),
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
export const postRunAllEvaluations = () =>
    request<FullEvaluationReport>('/evaluation/run-all', {
        method: 'POST',
    });


export interface FetchViewDataRequest {
    connection_string: string;
    view_name: string;
    role: string;
    limit?: number;
    offset?: number;
}


export const postFetchFilteredViewData = (params: FetchViewDataRequest) =>
  request<FetchViewDataResponse>('/data-quality/fetch-filtered-view-data', {
    method: 'POST',
    body: JSON.stringify(params),
  });