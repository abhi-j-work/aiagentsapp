import React from 'react';

const About: React.FC = () => {
  return (
    <div className="glass" style={{ margin: 'auto', maxWidth: '800px' }}>
      <div className="section-title">What is Entegris Research Agent?</div>
      <p>
        This application converts scientific text into a navigable knowledge graph using an LLM-only pipeline.
        Upload a PDF or TXT, or paste text directly. The agent extracts entities and relationships, then renders
        an interactive graph.
      </p>
      <p>
        <em>Tip: For best results, provide technical papers, process notes, or research summaries.</em>
      </p>
    </div>
  );
};

export default About;
