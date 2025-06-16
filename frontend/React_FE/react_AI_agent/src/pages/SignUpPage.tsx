import { Link } from 'react-router-dom';

const SignUpPage = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <div className="w-full relative max-w-4xl">
        <div className="relative card-border overflow-hidden rounded-2xl flex animate-float">
          
          {/* Left Side - Visual/Branding */}
          <div className="w-1/2 hidden md:flex flex-col justify-center items-center relative p-8">
            {/* Animated Visual Box */}
            <div className="w-full h-64 rounded-xl gradient-border inner-glow overflow-hidden relative mb-6">
              
              {/* Animated grid background */}
              <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full animate-pulse" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
              </div>
              
              {/* Connection lines SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 250">
                <defs>
                  <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor: '#4f46e5', stopOpacity: 0.8}}></stop>
                    <stop offset="50%" style={{stopColor: '#3b82f6', stopOpacity: 1}}></stop>
                    <stop offset="100%" style={{stopColor: '#8b5cf6', stopOpacity: 0.8}}></stop>
                  </linearGradient>
                </defs>
                <g stroke="url(#connectionGradient)" strokeWidth="2" fill="none">
                  <path className="connector" d="M200,125 L120,80 M200,125 L280,80 M200,125 L120,170 M200,125 L280,170"></path>
                  <circle cx="200" cy="125" r="4" fill="#3b82f6"></circle>
                  <circle cx="120" cy="80" r="3" fill="#4f46e5"></circle>
                  <circle cx="280" cy="80" r="3" fill="#8b5cf6"></circle>
                  <circle cx="120" cy="170" r="3" fill="#f59e0b"></circle>
                  <circle cx="280" cy="170" r="3" fill="#ef4444"></circle>
                </g>
              </svg>
              
              {/* Floating feature icons */}
              <div className="absolute top-8 left-8 animate-icon-float-1">
                <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-indigo-400/30 inner-glow"><svg className="w-6 h-6 text-indigo-400" fill="currentColor" viewBox="0 0 20 20" /></div>
              </div>
              <div className="absolute top-8 right-8 animate-icon-float-2">
                <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-purple-400/30 inner-glow"><svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20" /></div>
              </div>
              <div className="absolute bottom-8 left-8 animate-icon-float-3">
                <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-orange-400/30 inner-glow"><svg className="w-6 h-6 text-orange-400" fill="currentColor" viewBox="0 0 20 20" /></div>
              </div>
              <div className="absolute bottom-8 right-8 animate-icon-float-4">
                <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-blue-400/30 inner-glow"><svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20" /></div>
              </div>
              
              {/* Central logo/brand */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-schema-pulse">
                <div className="w-16 h-16 glass flex items-center justify-center inner-glow border-blue-400/50 border rounded-2xl">
                  <div className="text-2xl font-bold text-white">S</div>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-white tracking-tight mb-2">Join our platform</h2>
              <p className="text-white/70 text-sm font-inter">Connect with powerful tools and features designed for modern workflows.</p>
            </div>
          </div>
          
          {/* Vertical divider */}
          <div className="w-px bg-gradient-to-b from-transparent via-white/30 to-transparent"></div>
          
          {/* Right Side - Form */}
          <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              <span className="inline-block px-3 py-1 glass text-indigo-300 rounded-full text-xs font-medium mb-6 border border-indigo-400/30">Get Started</span>
              <h3 className="text-xl font-medium text-white mb-6">Create Account</h3>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
                  <input type="text" className="w-full px-4 py-3 glass rounded-lg border border-white/20 text-white placeholder-white/50 focus:border-indigo-400 focus:outline-none transition" placeholder="Enter your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                  <input type="email" className="w-full px-4 py-3 glass rounded-lg border border-white/20 text-white placeholder-white/50 focus:border-indigo-400 focus:outline-none transition" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
                  <input type="password" className="w-full px-4 py-3 glass rounded-lg border border-white/20 text-white placeholder-white/50 focus:border-indigo-400 focus:outline-none transition" placeholder="Create password" />
                </div>
                <button type="submit" className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition duration-200 transform hover:scale-[1.02] shadow-lg">
                  Sign Up
                </button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-white/60 text-sm font-inter">
                  Already have an account?{' '}
                  <Link to="/" className="text-indigo-400 hover:text-indigo-300 transition">Sign in</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;  