// ====================================================================
// API CLIENT SETUP
// ====================================================================

// Use environment variables for the base URL for flexibility between environments.
const API_BASE_URL ='http://localhost:1045';


async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    
    // --- START: BULLETPROOF URL CONSTRUCTION ---
    // 1. Trim any accidental whitespace from the base URL and endpoint.
    const cleanBase = API_BASE_URL.trim();
    const cleanEndpoint = endpoint.trim();

    // 2. Remove any trailing slash from the base URL to prevent double slashes.
    const baseUrlNoSlash = cleanBase.endsWith('/') ? cleanBase.slice(0, -1) : cleanBase;
    
    // 3. Ensure the endpoint path starts with a single slash.
    const endpointWithSlash = cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`;

    // 4. Join the base URL and the endpoint path.
    const finalUrl = `${baseUrlNoSlash}${endpointWithSlash}`;
    // --- END: BULLETPROOF URL CONSTRUCTION ---
    
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
        return response.json();
    } catch (error: any) {
        console.error(`API request to ${finalUrl} failed:`, error);
        throw new Error(error.message || 'A network error occurred. Please check your browser console and ensure the backend server is running.');
    }
}

// --- NEW ---
/**
 * A helper function to stream a file from the backend and trigger a browser download.
 * @param endpoint The API endpoint for the download.
 * @param body The request body to send.
 * @param filename The desired name for the downloaded file.
 */
async function streamDownload(endpoint: string, body: any, filename: string): Promise<void> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: `Download request to ${url} failed with HTTP status ${response.status}`
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
        console.error(`File download from ${url} failed:`, error);
        alert(`Failed to download file: ${error.message}`);
    }
}
// --- END NEW ---


// ====================================================================
// DATA GOVERNANCE AGENT
// ====================================================================

// --- Types ---

export interface TableDetails {
  columns: {
    column_name: string;
    data_type: string;
  }[];
}

export interface ExtractedSchema {
  tables: {
    [tableName: string]: TableDetails;
  };
  foreign_keys: any[]; // Use `any` if the structure is unknown or variable
}

export interface RelationshipExplanation {
  from_table: string;
  to_table: string;
  business_rule: string;
  impact_of_change: string;
}

export interface FoundationalTable {
  table_name: string;
  business_role: string;
  impact_of_change: string;
}

export interface ReferentialIntegrityResponse {
  relationship_explanations: RelationshipExplanation[];
  foundational_tables: FoundationalTable[];
}

export interface ClassificationResult {
  table_name: string;
  columns: {
    column_name: string;
    data_type: string;
    classification: string;
    reasoning: string;
  }[];
}

export type ListViewsResponse = {
    governed_views: string[];
};

export type FetchViewDataResponse = {
    view_name: string;
    row_count: number;
    data: Record<string, any>[];
};


// --- NEW ---
// These types are required for the download functionality.
export interface SQLGenerationResponse {
  sql_statements: string[];
  message: string;
}
export interface DownloadGovernanceReportRequest {
  referential_integrity: ReferentialIntegrityResponse;
  masking_sql: SQLGenerationResponse;
}
// --- END NEW ---


// --- API Functions ---

export const postExtractSchema = (connection_string: string) => {
  return request<{ schema_data: ExtractedSchema }>('/data-gov/schema', {
    method: 'POST',
    body: JSON.stringify({ connection_string }),
  });
};

export const postExplainIntegrity = (connection_string: string): Promise<ReferentialIntegrityResponse> => {
    return request<ReferentialIntegrityResponse>('/data-gov/explain_referential_integrity', {
        method: 'POST',
        body: JSON.stringify({ connection_string }),
    });
};

export const postClassifyData = (schema_data: ExtractedSchema) => {
  return request<{ classification_results: ClassificationResult[] }>('/data-gov/classify_data', {
    method: 'POST',
    body: JSON.stringify({ schema_data }),
  });
};

export const postGenerateMaskingSQL = (classification_results: ClassificationResult[]): Promise<SQLGenerationResponse> => {
  return request<SQLGenerationResponse>('/data-gov/generate_masking_sql', {
    method: 'POST',
    body: JSON.stringify({ classification_results }),
  });
};

export const postApplyMaskingPlan = (connection_string: string, sql_statements: string[]) => {
  return request<{ message: string }>('/data-gov/apply_masking_plan', {
    method: 'POST',
    body: JSON.stringify({ connection_string, sql_statements }),
  });
};

export const postListGovernedViews = (connectionString: string): Promise<ListViewsResponse> => {
    return request<ListViewsResponse>('/data-gov/list-governed-views', {
        method: 'POST',
        body: JSON.stringify({ connection_string: connectionString }),
    });
};

export const postFetchViewData = (
    connectionString: string, 
    viewName: string, 
    role: string, 
    limit = 50
): Promise<FetchViewDataResponse> => {
    return request<FetchViewDataResponse>('/data-gov/fetch-view-data', {
        method: 'POST',
        body: JSON.stringify({
            connection_string: connectionString,
            view_name: viewName,
            role: role, 
            limit: limit,
            offset: 0
        }),
    });
};


// --- NEW ---
/**
 * Downloads the full governance report as an Excel file.
 * @param data The combined report data containing integrity and SQL info.
 */
export const downloadExcelReport = (data: DownloadGovernanceReportRequest): Promise<void> => {
    return streamDownload('/data-gov/download/governance-report/excel', data, 'Data_Governance_Report.xlsx');
};

/**
 * Downloads the full governance report as a Word document.
 * @param data The combined report data containing integrity and SQL info.
 */
export const downloadWordReport = (data: DownloadGovernanceReportRequest): Promise<void> => {
    return streamDownload('/data-gov/download/governance-report/word', data, 'Data_Governance_Report.docx');
};
// --- END NEW ---


// ====================================================================
// TALK TO DB AGENT
// ====================================================================

// --- Types ---

export type TalkToDbRequest = {
  connection_string: string;
  prompt: string;
};


export const postTalkToDbQuery = (params: TalkToDbRequest): Promise<TalkToDbResponse> => {
    return request<TalkToDbResponse>('/talk-to-db/query', {
        method: 'POST',
        body: JSON.stringify(params),
    });
};


// ====================================================================
// DATA QUALITY AGENT
// ====================================================================

// --- Types ---

export interface ProposedQualityCheck {
    check_id: string;
    rule_name: string;
    rule_description: string;
    check_sql: string;
}

export interface StatisticalColumnProfile {
    name: string;
    type: string;
    null_count: number;
    null_percentage: number;
    distinct_count: number;
    uniqueness_ratio: number;
}

export interface DataProfile {
    table_name: string;
    total_rows: number;
    columns: StatisticalColumnProfile[];
}

export interface LLMSemanticColumnProfile {
    column_name: string;
    inferred_semantic_type: string;
    description: string;
    potential_issues_summary: string;
}

export interface GenerateQualityPlanResponse {
    table_name: string;
    data_profile: DataProfile;
    semantic_profile: LLMSemanticColumnProfile[] | null;
    proposed_checks: ProposedQualityCheck[];
    evaluation?: EvaluationResult | null;
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




// --- Base Types ---
// This is your original code block, unchanged.
export interface ProposedQualityCheck {
    check_id: string;
    rule_name: string;
    rule_description: string;
    check_sql: string;
}

export interface ValidationResult {
    check_id: string;
    rule_name: string;
    is_valid: boolean;
    invalid_count: number;
    total_rows: number;
    check_query: string;
}

// --- Data Profiling Types (from new backend) ---
export interface GenerateDataProfileRequest {
    table_name: string;
    connection_string?: string | null;
}

export interface ColumnProfile {
    column_name: string;
    data_type: string;
    total_values: number;
    null_count: number;
    null_percentage: number;
    distinct_count: number;
    distinct_percentage: number;
    min_value?: number | null;
    max_value?: number | null;
    avg_value?: number | null;
    std_dev?: number | null;
    min_length?: number | null;
    max_length?: number | null;
    avg_length?: number | null;
    earliest_date?: string | null;
    latest_date?: string | null;
}

export interface GenerateDataProfileResponse {
    columns: any;
    table_name: string;
    column_profiles: ColumnProfile[];
}

// --- Quality Plan Generation Types ---
export interface GenerateQualityPlanResponse {
    table_name: string;
    proposed_checks: ProposedQualityCheck[];
}

// --- Quality Check Execution Types ---
export interface ExecuteQualityChecksRequest {
    table_name: string;
    connection_string?: string | null;
    checks_to_run: ProposedQualityCheck[];
}

export interface ExecuteQualityChecksResponse {
    table_name: string;
    validation_results: ValidationResult[];
}



async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// This is your original code block, unchanged.
export interface ColumnProfile {
    column_name: string;
    data_type: string;
    total_values: number;
    null_count: number;
    null_percentage: number;
    distinct_count: number;
    distinct_percentage: number;
    min_value?: number | null;
    max_value?: number | null;
    avg_value?: number | null;
    std_dev?: number | null;
    min_length?: number | null;
    max_length?: number | null;
    avg_length?: number | null;
    earliest_date?: string | null;
    latest_date?: string | null;
}

export interface GenerateDataProfileResponse {
    table_name: string;
    column_profiles: ColumnProfile[];
}

// This is your original code block, unchanged.
export interface ProposedQualityCheck {
    check_id: string;
    rule_name: string;
    rule_description: string;
    check_sql: string;
}

export interface GenerateQualityPlanResponse {
    table_name: string;
    proposed_checks: ProposedQualityCheck[];
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


// --- API Fetch Functions ---

/**
 * A helper function to handle API requests and errors.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (!response.ok) {
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.detail || JSON.stringify(errorData);
        } catch (e) {
            // The response was not JSON, stick with the status text
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

export function postGenerateDataProfile(connection_string: string, table_name: string): Promise<GenerateDataProfileResponse> {
    return apiFetch('/data-quality/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_string, table_name }),
    });
}


export function postGenerateQualityPlan(connection_string: string, table_name: string, customRules: string): Promise<GenerateQualityPlanResponse> {
    return apiFetch('/data-quality/generate-quality-plan', {
        method: 'POST',
        body: JSON.stringify({ connection_string, table_name }),
    });
}

/**
 * Executes a list of selected data quality checks against a table.
 */
export function postExecuteQualityChecks(connection_string: string, table_name: string, checks_to_run: ProposedQualityCheck[]): Promise<ExecuteQualityChecksResponse> {
    return apiFetch('/data-quality/execute-quality-checks', {
        method: 'POST',
        body: JSON.stringify({ connection_string, table_name, checks_to_run }),
    });
}

export type EvaluationResult = {
  is_safe: boolean;
  is_relevant: boolean;
  reasoning: string;
  score: number;
};

// Update the main response type to use the new EvaluationResult
export type TalkToDbResponse = {
  generated_sql: string;
  data?: Record<string, any>[];
  message?: string;
  safety_warning?: string | null;
  evaluation?: EvaluationResult | null; 
};



// This is your original commented out code block, unchanged.
// async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
//     // Ensure the URL starts with a slash.
//     const apiUrl = url; 
    
//     try {
//         const response = await fetch(apiUrl, {
//             headers: { 'Content-Type': 'application/json', ...options.headers },
//             ...options,
//         });

//         if (!response.ok) {
//             const errorData = await response.json().catch(() => ({ detail: `HTTP error! Status: ${response.status}` }));
//             throw new Error(errorData.detail);
//         }
//         return response.json();
//     } catch (error: any) {
//         console.error(`API request to ${apiUrl} failed:`, error);
//         // Re-throw a user-friendly error message.
//         throw new Error(error.message || 'Network request failed. Please check the console and ensure the backend server is running.');
//     }
// }


// --- Type Definitions for Evaluation ---

/**
 * Summary for a single agent's performance.
 */
export interface AgentEvaluationSummary {
  agent: string;
  status: 'Completed' | 'Not Run' | 'Failed' | 'No Dataset' | 'Not Implemented';
  average_score: number;
  total_prompts: number;
}

/**
 * Detailed result for a single "Talk-to-DB" evaluation task.
 * It has an extra `golden_sql` field.
 */
export interface TalkToDbDetailedResult {
  prompt: string;
  status: 'SUCCESS' | 'API_ERROR' | 'SCRIPT_ERROR';
  generated_sql: string | null;
  golden_sql: string;
  score: number;
  reasoning: string;
  latency_ms: number;
}

/**
 * Generic detailed result for other agent tasks (Data Quality, Data Governance).
 */
export interface AgentTaskDetailedResult {
    prompt: string;
    status: 'SUCCESS' | 'API_ERROR' | 'SCRIPT_ERROR';
    score: number;
    reasoning: string;
    latency_ms: number;
}

/**
 * The main structure for the full evaluation report from the backend.
 */
export interface FullEvaluationReport {
  summary_report: AgentEvaluationSummary[];
  detailed_results: {
    talk_to_db: TalkToDbDetailedResult[];
    data_quality: AgentTaskDetailedResult[];
    data_governance: AgentTaskDetailedResult[];
  };
}

/**
 * API function to trigger the evaluation run and fetch the report.
 */
export const postRunAllEvaluations = (): Promise<FullEvaluationReport> => {
    return request<FullEvaluationReport>('/evaluation/run-all', {
        method: 'POST',
    });
};