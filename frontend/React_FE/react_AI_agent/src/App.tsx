import { Routes, Route } from 'react-router-dom';
import MainLayout from  './components/layout/MainLayout';
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import DataGovernancePage from './pages/DataGovernancePage';
import PricingPage  from './pages/PricingPage';
import TechStackPage from './pages/TechStackPage';
import AIAgentPage from './pages/AIAgentPage';
import TalkToDbPage from './pages/TalkToDbPage';
import AgentHubPage from './pages/AgentHubPage';
import DataQualityAgentPage from './pages/DataQualityAgentPage';
import DataQualityIntroPage from './pages/DataQualityIntroPage';
import TalkToDbIntroPage from './pages/TalkToDbIntroPage';
import CollaborativeAgentsPage from './pages/CollaborativeAgentsPage';
import DataIntelligenceConsole from './pages/DataIntelligenceConsole';
import MetadataSearchPage from './pages/MetaDataSearchPage';
import DataVisualizationPage from './pages/DataVisualizationPage';
import IcebergAIAgentPage from './pages/IceBergAiAgent';
import DataVisualizationV1 from './pages/DataVisualizationV1';
import AIGovernancePitchInfographic from './pages/AIGovernancePitchInfographic';
import MetaDataSearchIntroPage from './pages/MetaDataSearchIntroPage';
import IcebergCatalogIntroPage from './pages/IcebergCatalogIntroPage';
import EvaluationPage from './pages/EvaluationPage';
import LineageDisplay from './pages/DataLineageAgentPage';
import DataLineageAgentPage from './pages/DataLineageAgentPage';
import DataLineageIntroPage from './pages/DataLineageIntroPage';
import TrainPage from './pages/TrainPage';
import RunsPage from './pages/RunsPage';
import ModelsPage from './pages/ModelsPage';
import LogsPage from './pages/LogsPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/data-governance" element={<DataGovernancePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/tech-stack" element={<TechStackPage />} /> 
        <Route path="/ai-agent" element={<AIAgentPage />} />
        <Route path="/talk-to-db" element={<TalkToDbPage />}/> 
        <Route path="/data-ai-agent" element={<AgentHubPage/>}/> 
        <Route path="/data-quality" element={<DataQualityAgentPage />} />
        <Route path="/data-quality-intro" element ={ <DataQualityIntroPage/>} />
        <Route path="/talk-to-db-intro" element ={ <TalkToDbIntroPage/>} />
        <Route path="/collaborative-agents" element={<CollaborativeAgentsPage />} />
        <Route path="/metadata-console" element={<MetadataSearchPage/> }/>
        <Route path="/visual-console" element={<DataVisualizationPage/> }/>
        <Route path="/iceberg-console" element={<IcebergAIAgentPage/> }/>
        <Route path="/ai-console" element={<DataIntelligenceConsole/> }/>
        <Route path="/data-visual-console" element={<DataVisualizationV1/> }/>
        <Route path="/metadata-search" element={<MetaDataSearchIntroPage/> }/>
        <Route path="/iceberg-governance" element={<IcebergCatalogIntroPage/> }/>
        <Route path="/evaluation" element={<EvaluationPage/> }/>
        <Route path="/about" element={<AIGovernancePitchInfographic/> }/>
        <Route path="/data-lineage" element={<DataLineageAgentPage/>} />
        <Route path="/data-lineage-intro" element={<DataLineageIntroPage />} />

        {/* Model Training Routes */}
        <Route path="/training/start" element={<TrainPage />} />
        <Route path="/training/runs" element={<RunsPage />} />
        <Route path="/training/models" element={<ModelsPage />} />
        <Route path="/training/logs/:jobId" element={<LogsPage />} />
      </Route>
    </Routes>
  );
}

export default App;