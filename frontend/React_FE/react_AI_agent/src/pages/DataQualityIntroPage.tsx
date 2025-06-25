import React from 'react';
import { Link } from 'react-router-dom';
// Import all necessary icons for the new animation and page
import { 
    ArrowRight, 
    Sparkles, 
    Filter, 
    CheckCircle, 
    XCircle 
} from 'lucide-react';

// ===================================================
// Component 1: The NEW Animation for Data Quality
// This visual represents data being filtered for quality.
// ===================================================
const DataQualityAnimation = () => (
    <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative animate-vertical-float-subtle">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full animate-pulse" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div>
        </div>

        {/* SVG for the connecting lines and animated data points */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 180">
            <defs>
                <linearGradient id="dqGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor:'#f59e0b', stopOpacity:0.8}} />
                    <stop offset="100%" style={{stopColor:'#fbbf24', stopOpacity:0.8}} />
                </linearGradient>
            </defs>
            <g stroke="url(#dqGradient)" strokeWidth="1.5" fill="none">
                {/* Paths */}
                <path id="incoming-path" className="dq-connector-1" d="M30,90 H150" />
                <path className="dq-connector-2" d="M170,90 L250,50" />
                <path className="dq-connector-3" d="M170,90 L250,130" />

                {/* Animated Data Points */}
                <circle className="data-point" r="2.5" fill="#fbbf24" style={{ animationDelay: '0s' }} />
                <circle className="data-point" r="2.5" fill="#fbbf24" style={{ animationDelay: '0.4s' }} />
                <circle className="data-point" r="2.5" fill="#fbbf24" style={{ animationDelay: '0.8s' }} />
            </g>
        </svg>

        {/* Static Icons representing the workflow */}
        <div className="absolute inset-0 w-full h-full">
            {/* Filter Icon (The Validator) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-schema-pulse">
                <div className="w-14 h-14 glass rounded-full flex items-center justify-center border-2 border-amber-400/40 inner-glow">
                    <Filter className="w-7 h-7 text-amber-300" />
                </div>
            </div>
            {/* "Good Data" Output */}
            <div className="absolute right-8 top-10 animate-pulse" style={{ animationDelay: '1s' }}>
                <div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-green-400/30 inner-glow">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
            </div>
            {/* "Bad Data" Output */}
            <div className="absolute right-8 bottom-10 animate-pulse" style={{ animationDelay: '1s' }}>
                <div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-red-400/30 inner-glow">
                    <XCircle className="w-6 h-6 text-red-400" />
                </div>
            </div>
        </div>
    </div>
);


// ===================================================
// Component 2: The Reusable Feature Card Shell
// ===================================================
type FeatureCardProps = {
  visual: React.ReactNode;
  title: string;
  description: string;
  linkTo: string;
  status: string;
};

const FeatureCard = ({ visual, title, description, linkTo, status }: FeatureCardProps) => (
    <div className="relative card-border overflow-hidden rounded-2xl flex flex-col animate-vertical-float w-full max-w-xs mx-auto">
      <div className="p-4 flex justify-center relative">{visual}</div>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      <div className="p-4 flex-grow flex flex-col">
          <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
          <p className="text-white/70 mb-4 leading-relaxed text-xs flex-grow">{description}</p>
          <div className="flex justify-between items-center mt-auto">
              <Link to={linkTo} className="text-indigo-400 hover:text-indigo-300 transition flex items-center text-xs font-medium glass px-3 py-1.5 rounded-lg border border-indigo-400/30">
                  Start<ArrowRight className="w-3 h-3 ml-1" />
              </Link>
              <span className="text-white/50 text-xs glass px-2 py-1 rounded-full border border-white/10">{status}</span>
          </div>
      </div>
    </div>
);

// ===================================================
// Component 3: The Final Page Component
// ===================================================
const DataQualityIntroPage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-400" />
            Data Quality AI Agent
        </h1>
        <p className="text-slate-400 mt-2 max-w-xl mx-auto">
            Ensure the accuracy, consistency, and reliability of your data by automatically identifying and reporting quality issues.
        </p>
      </div>

      <div className="flex justify-center">
        <FeatureCard
          visual={<DataQualityAnimation />}
          title="AI Automated Quality Checks"
          description="Connect to your database and let the AI propose and execute a plan to check for nulls, duplicates, formatting errors, and more."
          linkTo="/data-quality" 
          status="Live"
        />
      </div>
    </div>
  );
};

export default DataQualityIntroPage;