import React, { useState } from 'react';
import styled from 'styled-components';
import { useGraph } from '../contexts/GraphContext';

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 14px;
`;

const PrimaryButton = styled.button`
  border-radius: 12px;
  padding: 0.7rem 1rem;
  background: linear-gradient(90deg, #2dd4bf, #60a5fa);
  color: #0b0f13;
  border: 0;
  font-weight: 700;
  letter-spacing: 0.02em;
  box-shadow: 0 8px 24px rgba(96,165,250,0.35);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin-top: 1rem;

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.08);
  }

  &:disabled {
    cursor: not-allowed;
    background: #555;
    color: #999;
    box-shadow: none;
  }
`;

const FileInput = styled.input`
  font-size: 12px;
`;

const TextArea = styled.textarea`
  height: 260px;
  resize: vertical;
`;

const GraphInput: React.FC = () => {
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>('');
  const { generateGraph, isLoading, error } = useGraph();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (mode === 'upload' && file) {
      generateGraph({ type: 'file', value: file });
    } else if (mode === 'paste' && text.trim()) {
      generateGraph({ type: 'text', value: text });
    }
  };

  const isSubmitDisabled = isLoading || (mode === 'upload' && !file) || (mode === 'paste' && !text.trim());

  return (
    <div className="glass">
      <h3 className="section-title">Input Document</h3>
      <InputContainer>
        <RadioGroup>
          <RadioLabel>
            <input
              type="radio"
              name="input-mode"
              value="upload"
              checked={mode === 'upload'}
              onChange={() => setMode('upload')}
            />
            Upload (.txt/.pdf)
          </RadioLabel>
          <RadioLabel>
            <input
              type="radio"
              name="input-mode"
              value="paste"
              checked={mode === 'paste'}
              onChange={() => setMode('paste')}
            />
            Paste text
          </RadioLabel>
        </RadioGroup>

        {mode === 'upload' ? (
          <FileInput type="file" accept=".txt,.pdf" onChange={handleFileChange} />
        ) : (
          <TextArea
            placeholder="Paste a research abstract, methods section, process notes, etc."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        <div className="rule"></div>

        <PrimaryButton onClick={handleSubmit} disabled={isSubmitDisabled}>
          {isLoading ? 'Generating...' : 'Generate Knowledge Graph'}
        </PrimaryButton>

        {error && <p style={{color: '#f87171', fontSize: '13px', textAlign: 'center'}}>{error}</p>}
      </InputContainer>
    </div>
  );
};

export default GraphInput;
