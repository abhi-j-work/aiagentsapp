  import React from 'react';
  import { Link, useLocation } from 'react-router-dom';
  import { Infinity as InfinityIcon, Home } from 'lucide-react';

  // Define navigation items in an array for clean and manageable code
  const navItems = [
    { name: 'Data AI Agent', href: '/data-ai-agent' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Tech Stack', href: '/tech-stack' },
  ];

  const Header: React.FC = () => {
    const location = useLocation();

    return (
      <nav className="relative z-30 w-full px-6 py-4 bg-black/60 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">

          {/* Logo */}
          <Link to="/app" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md">
              <InfinityIcon className="text-white h-4 w-4" />
            </div>
            <span className="text-white font-semibold text-lg font-geist tracking-wide">Data AI Agent Marketplace</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
              px-4 py-2 rounded-md text-sm font-inter font-medium transition-all duration-200
              ${isActive
                      ? 'bg-indigo-500 text-white shadow-inner'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }
            `}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Back to Home Button */}
          <Link
            to="/"
            className="bg-white/10 hover:bg-white/20 transition-all border border-white/20 px-4 py-2 rounded-md text-white text-sm font-medium font-inter backdrop-blur-md shadow-md hover:-translate-y-[1px] flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

    );
  };

  export default Header;