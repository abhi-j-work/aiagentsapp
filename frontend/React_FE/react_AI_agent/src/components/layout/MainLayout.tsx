import React from 'react';
import { Outlet } from 'react-router-dom';
import AnimatedBackground from '../shared/AnimatedBackground';
import Header from '../shared/Header';
import Footer from '../shared/Footer';

const MainLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen w-screen overflow-hidden font-geist">
      <AnimatedBackground />
      <Header />
      <main className="relative z-10">
        <Outlet />
        
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout; 