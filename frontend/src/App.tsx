import React, { useState } from 'react';
import styled from 'styled-components';

// Import pages
import Workspace from './pages/Workspace';
import Settings from './pages/Settings';
import About from './pages/About';

// Styled Components
const AppContainer = styled.div`
  padding: 2rem 3rem;
  max-width: 1800px;
  margin: 0 auto;
`;

const Header = styled.header`
  margin-bottom: 1rem;
`;

const TabContainer = styled.nav`
  display: flex;
  gap: 8px;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TabButton = styled.button<{ isActive: boolean }>`
  font-family: "Inter", sans-serif;
  font-weight: 600;
  font-size: 15px;
  padding: 12px 20px;
  border: none;
  background: none;
  color: ${({ isActive }) => (isActive ? '#e8eef6' : '#8a9bb3')};
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease-in-out;

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: #60a5fa;
    transform: ${({ isActive }) => (isActive ? 'scaleX(1)' : 'scaleX(0)')};
    transition: transform 0.3s ease-in-out;
  }

  &:hover {
    color: #e8eef6;
  }
`;

const ContentContainer = styled.main`
  padding: 1rem 0;
`;

type Tab = 'Workspace' | 'Settings' | 'About';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Workspace');

  const renderContent = () => {
    switch (activeTab) {
      case 'Workspace':
        return <Workspace />;
      case 'Settings':
        return <Settings />;
      case 'About':
        return <About />;
      default:
        return <Workspace />;
    }
  };

  return (
    <AppContainer>
      <Header>
        <h1 className="agent-title">Entegris Research Agent</h1>
        <p className="agent-sub">A React-based agentic interface for extracting knowledge graphs from scientific documents.</p>
      </Header>

      <div className="rule" style={{margin: '0 0 1.5rem 0'}}></div>

      <TabContainer>
        <TabButton isActive={activeTab === 'Workspace'} onClick={() => setActiveTab('Workspace')}>
          🧪 Workspace
        </TabButton>
        <TabButton isActive={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')}>
          ⚙️ Settings
        </TabButton>
        <TabButton isActive={activeTab === 'About'} onClick={() => setActiveTab('About')}>
          📎 About
        </TabButton>
      </TabContainer>

      <ContentContainer>
        {renderContent()}
      </ContentContainer>
    </AppContainer>
  );
};

export default App;
