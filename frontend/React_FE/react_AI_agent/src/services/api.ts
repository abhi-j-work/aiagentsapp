const API_BASE_URL = 'http://localhost:10086';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const config: RequestInit = { ...options, headers: defaultHeaders };
  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'An API error occurred');
    }
    return await response.json();
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error;
  }
}

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
  foreign_keys: any[]; 
}


export const postExtractSchema = (connection_string: string) => {
  return request<{ schema_data: ExtractedSchema }>('/data-gov/schema', {
    method: 'POST',
    body: JSON.stringify({ connection_string }),
  });
};

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

export const postExplainIntegrity = (connection_string: string) => {
    return request<ReferentialIntegrityResponse>('/data-gov/explain_referential_integrity', {
        method: 'POST',
        body: JSON.stringify({ connection_string }),
    });
};



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

export type ListViewsResponse = {
    governed_views: string[];
};

export type FetchViewDataResponse = {
    view_name: string;
    row_count: number;
    data: Record<string, any>[];
};

export const postListGovernedViews = async (connectionString: string): Promise<ListViewsResponse> => {
    const response = await fetch(`${API_BASE_URL}/data-gov/list-governed-views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_string: connectionString }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to list governed views.');
    }
    return response.json();
};

export const postFetchViewData = async (
    connectionString: string, 
    viewName: string, 
    role: string, 
    limit = 50
): Promise<FetchViewDataResponse> => {
    
    const response = await fetch(`${API_BASE_URL}/data-gov/fetch-view-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            connection_string: connectionString,
            view_name: viewName,
            role: role, 
            limit: limit,
            offset: 0
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to fetch data for view ${viewName}.`);
    }
    return response.json();
};


// 1. Define the types for the request and response
export type TalkToDbRequest = {
  connection_string: string;
  prompt: string;
};

export type TalkToDbResponse = {
  generated_sql: string;
  data?: Record<string, any>[]; // Data is an array of objects, but it's optional
  message?: string; // A message might be returned for non-SELECT queries
};


// 2. Create the API calling function
export const postTalkToDbQuery = async (params: TalkToDbRequest): Promise<TalkToDbResponse> => {
    // Note the updated URL to match your router prefix
    const response = await fetch(`${API_BASE_URL}/talk-to-db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to query the database.');
    }
    return response.json();
};