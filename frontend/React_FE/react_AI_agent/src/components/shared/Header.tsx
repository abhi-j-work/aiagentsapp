import { Link } from 'react-router-dom';
import { Infinity as InfinityIcon } from 'lucide-react'; // Import the icon component

const Header = () => {
  return (
    // The nav element is positioned relative to the viewport with a high z-index
    <nav className="relative z-20 w-full px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        {/* Left Side: Logo and Brand Name */}
        <Link to="/" className="flex items-center space-x-2">
          {/* The glass effect icon container */}
          <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <InfinityIcon className="text-white h-4 w-4" />
          </div>
          <span className="text-white font-medium text-lg font-geist">Aurora</span>
        </Link>
        
        {/* Center: Navigation Links (hidden on mobile) */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="#" className="text-gray-300 hover:text-white transition-colors font-inter text-sm">Features</a>
          <a href="#" className="text-gray-300 hover:text-white transition-colors font-inter text-sm">Pricing</a>
          <a href="#" className="text-gray-300 hover:text-white transition-colors font-inter text-sm">About</a>
          <a href="#" className="text-gray-300 hover:text-white transition-colors font-inter text-sm">Contact</a>
        </div>
        
        {/* Right Side: Sign In Button */}
        <Link to="/signup">
          <button className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-lg text-white text-sm font-medium font-inter transition-all hover:bg-white/20 hover:-translate-y-0.5">
            Sign In
          </button>
        </Link>

      </div>
    </nav>
  );
};

export default Header;