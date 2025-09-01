import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- TypeScript Interfaces ---

export interface SimpleNode {
  id: string;
  type: string;
  size?: number;
  color?: string;
  font?: {
    size: number;
    color: string;
  };
  // For frontend highlighting
  label?: string;
  shadow?: boolean | { enabled: boolean; color: string; size: number };
  widthConstraint?: { maximum: number };
}

export interface SimpleRelationship {
  source: string;
  target: string;
  type: string;
  label: string;
  // For frontend highlighting
  from?: string; // vis.js expects from/to
  to?: string; // vis.js expects from/to
  color?: { color: string };
  width?: number;
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
  parsed_json: object | null;
}

// --- API Service Functions ---

export const generateGraphFromText = async (text: string): Promise<GraphData> => {
  const response = await apiClient.post('/api/generate/text', { text });
  return response.data;
};

export const generateGraphFromFile = async (file: File): Promise<GraphData> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/api/generate/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchInsights = async (graphData: GraphData, contextText: string): Promise<InsightData> => {
  const payload = {
    ...graphData,
    context_text: contextText,
  };
  const response = await apiClient.post('/api/insights', payload);
  return response.data;
};

export const fetchExperiment = async (path_nodes: string[], context_text: string): Promise<ExperimentData> => {
  const response = await apiClient.post('/api/experiment', { path_nodes, context_text });
  return response.data;
};
