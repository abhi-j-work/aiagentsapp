import { Link } from 'react-router-dom';
import { Infinity as InfinityIcon } from 'lucide-react';

const Header = () => {
  return (
    <nav className="relative z-20 w-full px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Changed this to link to the app's home, not the site root */}
        <Link to="/app" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <InfinityIcon className="text-white h-4 w-4" />
          </div>
          <span className="text-white font-medium text-lg font-geist">Aurora</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link to="/data-governance" className="text-gray-300 hover:text-white transition-colors font-inter text-sm">Data Agent</Link>
          <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors font-inter text-sm">Pricing</Link>
          <Link to="/tech-stack" className="text-gray-300 hover:text-white transition-colors font-inter text-sm">Tech Stack</Link>
        </div>
        
        {/* This button will now log the user out by taking them back to the sign-up page */}
        <Link to="/">
          <button className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-lg text-white text-sm font-medium font-inter transition-all hover:bg-white/20 hover:-translate-y-0.5">
            Sign Out
          </button>
        </Link>
      </div>
    </nav>
  );
};

export default Header;