import { Link } from 'react-router-dom';
import { Rocket, ShieldCheck, BrainCircuit, Play, ChevronDown, Infinity as InfinityIcon } from 'lucide-react';

// A small, reusable component for the feature cards
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="glass-card rounded-2xl p-6 text-center">
    <div className="w-12 h-12 rounded-xl bg-blue-500/10 backdrop-blur-sm border border-blue-400/20 flex items-center justify-center mx-auto mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-light text-white mb-2 font-geist tracking-tight">{title}</h3>
    <p className="text-gray-300 text-sm font-inter font-normal">{description}</p>
  </div>
);

// The main landing page component
const LandingPage = () => {
  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-6xl mx-auto text-center">
        {/* Main Heading */}
        <div className="mb-8 animate-float-animation">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-[1.1] font-geist tracking-tight">
            The Future of
            <span className="gradient-text block tracking-tight">AI Innovation</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed font-inter font-normal">
            Harness the power of advanced artificial intelligence with our cutting-edge platform.
            Transform your ideas into reality with unprecedented speed and precision.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link to="/signup">
            <button className="bg-white/15 backdrop-blur-lg border border-white/30 px-6 py-3 text-white rounded-lg font-medium text-sm min-w-[160px] font-inter transition-all hover:bg-white/25 hover:-translate-y-0.5 shadow-lg">
              Get Started Free
            </button>
          </Link>
          <button className="bg-white/5 backdrop-blur-lg border border-white/10 px-6 py-3 rounded-lg text-white font-medium text-sm min-w-[160px] font-inter opacity-60 transition-all hover:opacity-100 hover:-translate-y-0.5">
            <Play className="inline-block h-4 w-4 mr-2" />
            Watch Demo
          </button>
        </div>

        {/* Divider */}
        <div className="divider mb-16"></div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          <FeatureCard icon={<Rocket className="text-blue-400" size={24} />} title="Lightning Fast" description="Process millions of requests with ultra-low latency and high throughput." />
          <FeatureCard icon={<ShieldCheck className="text-indigo-400" size={24} />} title="Enterprise Security" description="Bank-grade security with end-to-end encryption and compliance." />
          <FeatureCard icon={<BrainCircuit className="text-purple-400" size={24} />} title="Smart AI" description="Advanced machine learning models that adapt and learn from your data." />
        </div>

        {/* Divider */}
        <div className="divider mb-16"></div>

        {/* Stats Section */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-8 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-light text-white mb-1 font-geist tracking-tight">10M+</div>
            <div className="text-gray-400 text-sm font-inter font-normal">API Calls Daily</div>
          </div>
          <div className="hidden sm:block vertical-divider h-12"></div>
          <div>
            <div className="text-3xl md:text-4xl font-light text-white mb-1 font-geist tracking-tight">99.9%</div>
            <div className="text-gray-400 text-sm font-inter font-normal">Uptime SLA</div>
          </div>
          <div className="hidden sm:block vertical-divider h-12"></div>
          <div>
            <div className="text-3xl md:text-4xl font-light text-white mb-1 font-geist tracking-tight">500+</div>
            <div className="text-gray-400 text-sm font-inter font-normal">Enterprise Clients</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-400">
        <div className="flex flex-col items-center">
          <span className="text-sm mb-2 font-inter font-normal">Discover More</span>
          <ChevronDown className="animate-bounce h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;