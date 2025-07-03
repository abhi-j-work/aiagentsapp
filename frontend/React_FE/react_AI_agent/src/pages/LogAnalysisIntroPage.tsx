import React from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowRight, 
    FileSearch2, // A great icon for log analysis
    Layers, 
    BrainCircuit, 
    ShieldAlert 
} from 'lucide-react';

// ===================================================
// Animation Component (pasted from above)
// ===================================================
const LogAnalysisAnimation = () => (
    <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative animate-vertical-float-subtle">
        {/* ... (full code from Component 1 above) ... */}
        <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full animate-pulse" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div>
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 180">
             <defs>
                <linearGradient id="logAnalysisGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor:'#f43f5e', stopOpacity:0.8}} />
                    <stop offset="100%" style={{stopColor:'#fb923c', stopOpacity:0.8}} />
                </linearGradient>
            </defs>
            <g stroke="url(#logAnalysisGradient)" strokeWidth="1.5" fill="none">
                <path className="log-connector-1" d="M60,90 Q 110,50 160,90" />
                <path className="log-connector-2" d="M160,90 Q 210,130 260,90" />
            </g>
        </svg>
        <div className="absolute inset-0 w-full h-full">
            <div className="absolute left-8 top-1/2 -translate-y-1/2 animate-pulse">
                <div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-rose-500/30 inner-glow">
                    <Layers className="w-6 h-6 text-rose-400" />
                </div>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-schema-pulse">
                 <div className="w-14 h-14 glass rounded-full flex items-center justify-center border-2 border-orange-400/40 inner-glow">
                    <BrainCircuit className="w-7 h-7 text-orange-300" />
                </div>
            </div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 animate-pulse">
                <div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-amber-500/30 inner-glow">
                    <ShieldAlert className="w-6 h-6 text-amber-400" />
                </div>
            </div>
        </div>
    </div>
);


// ===================================================
// Feature Card Component (pasted from above)
// ===================================================
// ... (full code from Component 2 above) ...
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
// Final Page Component
// ===================================================
const LogAnalysisIntroPage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
            <FileSearch2 className="w-8 h-8 text-orange-400" />
            Log Analysis Agent
        </h1>
        <p className="text-slate-400 mt-2 max-w-xl mx-auto">
            Your automated SRE. This agent monitors application logs, diagnoses errors with AI, and provides actionable incident reports.
        </p>
      </div>

      <div className="flex justify-center">
        <FeatureCard
          visual={<LogAnalysisAnimation />}
          title="Automated Incident Analysis"
          description="Connect to your application's log stream, and let the agent autonomously detect, analyze, and report on critical errors."
          linkTo="/log-analysis" // This links to the actual dashboard page
          status="Live"
        />
      </div>
    </div>
  );
};

export default LogAnalysisIntroPage;