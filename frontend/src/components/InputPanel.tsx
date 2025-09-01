import React, { useState } from 'react';
import { generateGraphFromText, generateGraphFromFile, fetchInsights, GraphData, InsightData } from '../services/api';

interface InputPanelProps {
  onGenerationStart: () => void;
  onGenerationSuccess: (data: GraphData, text: string) => void;
  onGenerationError: (error: string) => void;
  onGenerationEnd: () => void;
  graphData: GraphData | null;
  rawText: string;
  setInsightData: (data: InsightData | null) => void;
  setHighlightedPath: (path: { nodes: string[]; pairs: string[][] } | null) => void;
}

type InputMode = 'paste' | 'upload';

const InputPanel: React.FC<InputPanelProps> = ({
  onGenerationStart,
  onGenerationSuccess,
  onGenerationError,
  onGenerationEnd,
  graphData,
  rawText,
  setInsightData,
  setHighlightedPath,
}) => {
  const [mode, setMode] = useState<InputMode>('paste');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInsightLoading, setIsInsightLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf' || selectedFile.type === 'text/plain') {
        setFile(selectedFile);
      } else {
        alert('Please upload a PDF or TXT file.');
      }
    }
  };

  const handleSubmit = async () => {
    onGenerationStart();
    setIsProcessing(true);
    setInsightData(null);
    setHighlightedPath(null);

    try {
      let result: GraphData;
      let documentText: string;

      if (mode === 'paste') {
        if (!text.trim()) throw new Error('Pasted text cannot be empty.');
        result = await generateGraphFromText(text);
        documentText = text;
      } else {
        if (!file) throw new Error('Please select a file to upload.');
        if (file.type === 'text/plain') {
            documentText = await file.text();
        } else {
            documentText = `Content from ${file.name}`; // PDF text is extracted on backend
        }
        result = await generateGraphFromFile(file);
      }
      onGenerationSuccess(result, documentText);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'An unknown error occurred.';
      onGenerationError(errorMessage);
    } finally {
      setIsProcessing(false);
      onGenerationEnd();
    }
  };

  const handleFetchInsights = async () => {
    if (!graphData || !rawText) return;
    setIsInsightLoading(true);
    setInsightData(null);
    try {
      const insights = await fetchInsights(graphData, rawText);
      setInsightData(insights);
      if (insights.found && insights.raw_paths.length > 0) {
        // Automatically highlight the first (best) path
        const bestPath = insights.raw_paths[0];
        const pairs = bestPath.map((node, i) => i < bestPath.length - 1 ? [node, bestPath[i+1]] : []).filter(p => p.length > 0) as string[][];
        setHighlightedPath({ nodes: [...new Set(bestPath)], pairs });
      }
    } catch (err: any) {
       const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch insights.';
       alert(`Could not fetch insights: ${errorMessage}`);
    } finally {
        setIsInsightLoading(false);
    }
  };

  return (
    <div className="glass">
      <div className="section-title">Input Document</div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <label>
          <input type="radio" value="paste" checked={mode === 'paste'} onChange={() => setMode('paste')} />
          Paste text
        </label>
        <label>
          <input type="radio" value="upload" checked={mode === 'upload'} onChange={() => setMode('upload')} />
          Upload (.txt/.pdf)
        </label>
      </div>

      {mode === 'paste' ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a research abstract, methods section, process notes, etc."
          disabled={isProcessing}
        />
      ) : (
        <input
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
      )}

      <div className="rule"></div>

      <button onClick={handleSubmit} disabled={isProcessing} className="primary">
        {isProcessing ? 'Agent is thinking...' : 'Generate Knowledge Graph'}
      </button>

      {graphData && (
        <>
            <div className="rule"></div>
            <button onClick={handleFetchInsights} disabled={isInsightLoading} className="primary" style={{background: "linear-gradient(90deg, #5b21b6, #9333ea)"}}>
                {isInsightLoading ? 'Analyzing...' : 'Find Exceptional Insights'}
            </button>
        </>
      )}
    </div>
  );
};

export default InputPanel;
