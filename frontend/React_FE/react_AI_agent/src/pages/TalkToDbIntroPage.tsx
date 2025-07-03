import React from 'react';
import { Link } from 'react-router-dom';
// Import all necessary icons
import { 
    ArrowRight, 
    MessageSquareQuote,
    User, 
    BrainCircuit, 
    FileCode,
    Share2 // A great icon for agent-to-agent communication
} from 'lucide-react';

// ===================================================
// Component 1: The NEW Animation for "Talk to DB"
// (No changes needed here)
// ===================================================
const TalkToDbAnimation = () => (
    <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative animate-vertical-float-subtle">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full animate-pulse" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div>
        </div>

        {/* SVG for the connecting lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 180">
             <defs>
                <linearGradient id="nlpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor:'#10b981', stopOpacity:0.8}} />
                    <stop offset="100%" style={{stopColor:'#22d3ee', stopOpacity:0.8}} />
                </linearGradient>
            </defs>
            <g stroke="url(#nlpGradient)" strokeWidth="1.5" fill="none">
                <path className="nlp-connector-1" d="M60,90 Q 110,50 160,90" />
                <path className="nlp-connector-2" d="M160,90 Q 210,130 260,90" />
            </g>
        </svg>

        {/* Icons representing the workflow */}
        <div className="absolute inset-0 w-full h-full">
            <div className="absolute left-8 top-1/2 -translate-y-1/2 animate-pulse"><div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-teal-400/30 inner-glow"><User className="w-6 h-6 text-teal-300" /></div></div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-schema-pulse"><div className="w-14 h-14 glass rounded-full flex items-center justify-center border-2 border-cyan-400/40 inner-glow"><BrainCircuit className="w-7 h-7 text-cyan-300" /></div></div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2 animate-pulse"><div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-sky-400/30 inner-glow"><FileCode className="w-6 h-6 text-sky-300" /></div></div>
        </div>
    </div>
);


// ===================================================
// Component 2: The Reusable Feature Card Shell
// ===================================================
// CHANGED: The 'status' prop is now removed.
type FeatureCardProps = {
  visual: React.ReactNode;
  title: string;
  description: string;
  linkTo: string;
};

const FeatureCard = ({ visual, title, description, linkTo }: FeatureCardProps) => (
    <div className="relative card-border overflow-hidden rounded-2xl flex flex-col animate-vertical-float w-full max-w-xs mx-auto">
      <div className="p-4 flex justify-center relative">{visual}</div>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      <div className="p-6 flex-grow flex flex-col">
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-base text-slate-300 mb-4 leading-relaxed flex-grow">{description}</p>
          <div className="flex justify-between items-center mt-auto">
              
              {/* This "Start" button remains, pointing to the individual agent */}
              <Link 
                to={linkTo}
                className="group bg-green-600 text-white hover:bg-green-500 transition-all flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-green-500/30"
              >
                  Start Agent
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              
              {/* 
                CHANGED: 
                - The status badge is now a Link.
                - It points to the new collaborative page.
                - It has a distinct "secondary button" style.
              */}
              <Link 
                to="/collaborative-agents" 
                className="flex items-center gap-2 text-purple-300 hover:text-white hover:bg-purple-500/20 text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-400/30 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                Agent-to-Agent
              </Link>
          </div>
      </div>
    </div>
);

// ===================================================
// Component 3: The Final Page Component
// ===================================================
const TalkToDbIntroPage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
            <MessageSquareQuote className="w-8 h-8 text-cyan-400" />
            Talk to DB Agent
        </h1>
        <p className="text-slate-400 mt-2 max-w-xl mx-auto">
            The fastest way to get insights from your data. Simply ask a question and let our AI handle the SQL.
        </p>
      </div>

      <div className="flex justify-center">
        <FeatureCard
          visual={<TalkToDbAnimation />}
          title="Natural Language Querying"
          description="Connect to your database, ask a question in plain English, and receive the generated SQL and data results in real-time."
          linkTo="/talk-to-db" 
        />
      </div>
    </div>
  );
};

export default TalkToDbIntroPage;