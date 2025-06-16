import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import DataGovernancePage from './pages/DataGovernancePage'; // 👈 IMPORT THE NEW PAGE

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/data-gov" element={<DataGovernancePage />} /> {/* 👈 ADD THE NEW ROUTE */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;   