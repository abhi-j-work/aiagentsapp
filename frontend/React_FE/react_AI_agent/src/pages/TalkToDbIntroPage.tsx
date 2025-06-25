import React from 'react';
import { Link } from 'react-router-dom';
// Import all necessary icons
import { 
    ArrowRight, 
    MessageSquareQuote,
    User, 
    BrainCircuit, 
    FileCode 
} from 'lucide-react';

// ===================================================
// Component 1: The NEW Animation for "Talk to DB"
// This component visually represents the NLP -> SQL flow.
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
                {/* A new gradient color for the lines to match the new theme */}
                <linearGradient id="nlpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{stopColor:'#10b981', stopOpacity:0.8}} />
                    <stop offset="100%" style={{stopColor:'#22d3ee', stopOpacity:0.8}} />
                </linearGradient>
            </defs>
            <g stroke="url(#nlpGradient)" strokeWidth="1.5" fill="none">
                {/* Path from User icon to Brain icon */}
                <path className="nlp-connector-1" d="M60,90 Q 110,50 160,90" />
                {/* Path from Brain icon to SQL Code icon */}
                <path className="nlp-connector-2" d="M160,90 Q 210,130 260,90" />
            </g>
        </svg>

        {/* Icons representing the workflow */}
        <div className="absolute inset-0 w-full h-full">
            {/* User Icon (The user's question) */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 animate-pulse">
                <div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-teal-400/30 inner-glow">
                    <User className="w-6 h-6 text-teal-300" />
                </div>
            </div>
            {/* AI Brain Icon (The AI processing) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-schema-pulse">
                 <div className="w-14 h-14 glass rounded-full flex items-center justify-center border-2 border-cyan-400/40 inner-glow">
                    <BrainCircuit className="w-7 h-7 text-cyan-300" />
                </div>
            </div>
            {/* SQL Code Icon (The final output) */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 animate-pulse">
                <div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-sky-400/30 inner-glow">
                    <FileCode className="w-6 h-6 text-sky-300" />
                </div>
            </div>
        </div>
    </div>
);


// ===================================================
// Component 2: The Reusable Feature Card Shell
// This can be the same one used on your other pages for consistency.
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
          linkTo="/talk-to-db" // This should link to the actual agent page
          status="Live"
        />
      </div>
    </div>
  );
};

export default TalkToDbIntroPage;