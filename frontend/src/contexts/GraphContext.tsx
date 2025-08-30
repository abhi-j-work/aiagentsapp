import React, { createContext, useState, useContext, type ReactNode } from 'react';
import type { GraphData, Insight } from '../types';
import * as api from '../services/api';

interface GraphState {
  graphData: GraphData | null;
  insight: Insight | null;
  rawText: string;
  isLoading: boolean;
  error: string | null;
  generateGraph: (source: { type: 'text'; value: string } | { type: 'file'; value: File }) => Promise<void>;
}

const GraphContext = createContext<GraphState | undefined>(undefined);

export const GraphProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateGraph = async (source: { type: 'text'; value: string } | { type: 'file'; value: File }) => {
    setIsLoading(true);
    setError(null);
    setGraphData(null);
    setInsight(null);
    setRawText('');

    try {
      let response;
      if (source.type === 'text') {
        if (!source.value.trim()) {
          throw new Error('Text input cannot be empty.');
        }
        response = await api.generateGraphFromText(source.value);
      } else {
        response = await api.generateGraphFromFile(source.value);
      }
      setGraphData(response.graph);
      setInsight(response.insight);
      setRawText(response.raw_text);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    graphData,
    insight,
    rawText,
    isLoading,
    error,
    generateGraph,
  };

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
};

export const useGraph = (): GraphState => {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};
