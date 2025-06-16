import React from 'react';
import { Outlet } from 'react-router-dom';
import AuroraBackground from '../shared/AuroraBackground'; // 👈 CHANGE THIS IMPORT
import Header from '../shared/Header';

const MainLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden font-geist">
      <AuroraBackground /> {/* 👈 USE THE NEW COMPONENT */}
      <Header />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;