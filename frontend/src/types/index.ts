export interface Node {
  id: string | number;
  label?: string;
  group?: string;
  title?: string;
  size?: number;
  font?: any;
  color?: any;
  shadow?: any;
}

export interface Edge {
  from: string | number;
  to: string | number;
  label?: string;
  id?: string;
  color?: any;
  width?: number;
  font?: any;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface Insight {
  found: boolean;
  explanation?: string;
  paths?: string[];
  causal_candidates?: boolean[];
}

export interface GraphResponse {
  graph: GraphData;
  insight: Insight;
  raw_text: string;
}

export interface ExperimentRequest {
  path: string;
  context: string;
}

export interface ExperimentResponse {
  prompt?: string;
  llm_response?: string;
  parsed_json?: Record<string, any>;
  trace_url?: string;
  error?: string;
}
