import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  /* Import clean, modern typefaces */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&family=Space+Grotesk:wght@400;600;700&display=swap');

  /* Reset some defaults */
  body {
    margin: 0;
    font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif;
    background: radial-gradient(1200px 800px at 20% -10%, rgba(103, 232, 249, 0.18), transparent 40%),
                radial-gradient(1000px 800px at 120% 10%, rgba(147, 51, 234, 0.18), transparent 35%),
                linear-gradient(180deg, #0b0f13 0%, #0a0e12 60%, #090c10 100%);
    color: #e8eef6;
    overflow-x: hidden;
  }

  * {
    box-sizing: border-box;
  }

  /* Gradient header */
  .agent-title {
    font-family: "Space Grotesk", Inter, sans-serif;
    font-weight: 800;
    letter-spacing: -0.02em;
    font-size: 38px;
    line-height: 1.1;
    background: linear-gradient(90deg, #64d4ff 0%, #a78bfa 50%, #22d3ee 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 0.25rem;
  }

  /* Subheader badge */
  .agent-sub {
    opacity: 0.9;
    font-size: 14px;
    margin-bottom: 1rem;
  }

  /* Glass cards */
  .glass {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.09);
    box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04);
    border-radius: 18px;
    padding: 24px;
    backdrop-filter: blur(10px);
  }

  /* Accent divider */
  .rule {
    height: 1px;
    background: linear-gradient(90deg, rgba(99,102,241,0.0), rgba(99,102,241,0.65), rgba(99,102,241,0.0));
    margin: 16px 0;
  }

  /* Section title */
  .section-title {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 0.02em;
    margin-bottom: 12px;
  }

  /* Metric chips */
  .chip {
    display:inline-flex;
    align-items:center;
    gap:8px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid rgba(148,163,184,0.25);
    background: rgba(255,255,255,0.04);
    font-size: 13px;
    margin-right: 8px;
    white-space: nowrap;
  }

  /* HTML graph frame */
  .graph-frame {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05);
    height: 1000px;
    width: 100%;
  }

  /* Legend for the graph */
  #kg_legend {
    position: absolute;
    right: 20px;
    top: 20px;
    z-index: 100;
    background: rgba(6,10,18,0.8);
    color: #dffaf6;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    border: 1px solid rgba(0,255,204,0.08);
  }
  #kg_legend .sw {display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:8px;vertical-align:middle;}

  /* General input styles */
  input, textarea, select {
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #e8eef6;
    padding: 10px 12px;
    width: 100%;
    font-family: "Inter", sans-serif;
    font-size: 14px;
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  /* Vis-network overrides */
  .vis-network {
    outline: none;
  }
`;
