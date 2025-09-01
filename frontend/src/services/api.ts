import { GenerationResponse, ExperimentData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'An unknown server error occurred.' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function generateGraphFromText(text: string): Promise<GenerationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/generate/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return handleResponse(response);
}

export async function generateGraphFromFile(file: File): Promise<GenerationResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/api/generate/file`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(response);
}

export async function designExperimentForPath(pathNodes: string[], contextText: string): Promise<ExperimentData> {
  const response = await fetch(`${API_BASE_URL}/api/experiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path_nodes: pathNodes, context_text: contextText }),
  });
  return handleResponse(response);
}