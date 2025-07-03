// ====================================================================
// API CLIENT SETUP
// ====================================================================

// Use environment variables for the base URL for flexibility between environments.
const API_BASE_URL ='http://localhost:10096';

/**
 * A standardized helper function for making API requests using fetch.
 * This handles URL construction, headers, and error handling consistently.
 * @param endpoint - The API endpoint to call (e.g., '/data-gov/schema').
 * @param options - Standard fetch RequestInit options (method, body, etc.).
 * @returns A promise that resolves with the JSON response data.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config: RequestInit = {
    ...options,
    headers: defaultHeaders,
  };

  try {
    const response = await fetch(url, config);
    const responseData = await response.json();

    if (!response.ok) {
      // Throw an error with the detailed message from the backend if available.
      throw new Error(responseData.detail || 'An unknown API error occurred');
    }
    
    return responseData as T;
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    // Re-throw the error so the calling component can handle it.
    throw error;
  }
}


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

// --- API Functions ---

export const postExtractSchema = (connection_string: string) => {
  return request<{ schema_data: ExtractedSchema }>('/data-gov/schema', {
    method: 'POST',
    body: JSON.stringify({ connection_string }),
  });
};

export const postExplainIntegrity = (connection_string: string) => {
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

export const postGenerateMaskingSQL = (classification_results: ClassificationResult[]) => {
  return request<{ sql_statements: string[]; message: string }>('/data-gov/generate_masking_sql', {
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


// ====================================================================
// TALK TO DB AGENT
// ====================================================================

// --- Types ---

export type TalkToDbRequest = {
  connection_string: string;
  prompt: string;
};

export type TalkToDbResponse = {
  generated_sql: string;
  data?: Record<string, any>[];
  message?: string;
};

// --- API Function ---

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

// --- API Functions ---

// export const postGenerateQualityPlan = (
//     connectionString: string,
//     tableName: string,
//     enableSemanticProfiling: boolean
// ): Promise<GenerateQualityPlanResponse> => {
//     return request<GenerateQualityPlanResponse>('/data-quality/generate-quality-plan', {
//         method: 'POST',
//         body: JSON.stringify({
//             connection_string: connectionString || null,
//             table_name: tableName,
//             enable_semantic_profiling: enableSemanticProfiling,
//         }),
//     });
// };

// export const postExecuteQualityChecks = (
//     connectionString: string,
//     tableName: string,
//     checksToRun: ProposedQualityCheck[]
// ): Promise<ExecuteQualityChecksResponse> => {
//     return request<ExecuteQualityChecksResponse>('/data-quality/execute-quality-checks', {
//         method: 'POST',
//         body: JSON.stringify({
//             connection_string: connectionString || null,
//             table_name: tableName,
//             checks_to_run: checksToRun,
//         }),
//     });
// };

// src/services/api.ts

// --- Base Types ---
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
            // FastAPI validation errors are in `detail`, other custom errors might be too
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

export function postGenerateQualityPlan(connection_string: string, table_name: string): Promise<GenerateQualityPlanResponse> {
    return apiFetch('/data-quality/generate-quality-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_string, table_name }),
    });
}

export function postExecuteQualityChecks(connection_string: string, table_name: string, checks_to_run: ProposedQualityCheck[]): Promise<ExecuteQualityChecksResponse> {
    return apiFetch('/data-quality/execute-quality-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_string, table_name, checks_to_run }),
    });
}