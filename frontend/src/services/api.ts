import axios from 'axios';
import type { GraphResponse, ExperimentRequest, ExperimentResponse } from '../types';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generateGraphFromText = async (text: string): Promise<GraphResponse> => {
  const formData = new FormData();
  formData.append('text_input', text);

  const response = await apiClient.post('/generate-graph-from-text', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const generateGraphFromFile = async (file: File): Promise<GraphResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/generate-graph-from-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const designExperiment = async (data: ExperimentRequest): Promise<ExperimentResponse> => {
  const response = await apiClient.post('/design-experiment', data);
  return response.data;
};

export default apiClient;
