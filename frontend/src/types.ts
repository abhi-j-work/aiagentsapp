import { IdType } from 'vis-network/standalone/esm/vis-network';

export interface SimpleNode {
  id: string;
  type: string;
  size?: number;
  color?: string;
  font?: { size: number; color: string };
}

export interface SimpleRelationship {
  source: string;
  target: string;
  label: string;
}

export interface GraphData {
  nodes: SimpleNode[];
  relationships: SimpleRelationship[];
}

export interface InsightData {
  found: boolean;
  explanation: string;
  paths: string[];
  raw_paths: string[][];
  scores: number[];
  causal_candidates: boolean[];
}

export interface ParsedExperiment {
  title: string;
  hypothesis: string;
  experiment: {
    summary: string;
    controls: string[];
    materials: string[];
    steps: string[];
    measurements: string[];
    sample_size: number;
    success_criteria: string;
    safety_notes?: string;
  };
  expected_outcome: string;
  cost_estimate: string;
  time_estimate: string;
}

export interface ExperimentData {
  prompt: string;
  llm_response: string | null;
  parsed_json: ParsedExperiment | null;
  error: string | null;
  trace_url?: string;
}

export interface GenerationResponse {
  graph: GraphData;
  insight: InsightData;
}

export interface HighlightPath {
  nodes: IdType[];
  pairs: [IdType, IdType][];
}