import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { GraphProvider } from './contexts/GraphContext.tsx';
import { GlobalStyles } from './styles/globalStyles.ts';
import './index.css'; // Keep this for basic resets if any, or can be removed.

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GraphProvider>
      <GlobalStyles />
      <App />
    </GraphProvider>
  </React.StrictMode>,
);
