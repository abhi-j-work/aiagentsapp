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

      </Route>
    </Routes>
  );
}

export default App;