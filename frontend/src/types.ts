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

export interface ExperimentData {
  prompt: string;
  llm_response: string | null;
  parsed_json: any | null;
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