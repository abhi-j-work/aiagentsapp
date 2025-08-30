import React from 'react';
import styled from 'styled-components';
import GraphInput from '../components/GraphInput';
import GraphOutput from '../components/GraphOutput';

const WorkspaceLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.45fr;
  gap: 1.5rem;
  align-items: flex-start;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const Workspace: React.FC = () => {
  return (
    <WorkspaceLayout>
      <GraphInput />
      <GraphOutput />
    </WorkspaceLayout>
  );
};

export default Workspace;
