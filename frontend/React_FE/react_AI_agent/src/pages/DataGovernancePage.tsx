import React from 'react';
import { Link } from 'react-router-dom';
import { 
    Database, 
    ArrowRight, 
    User, 
    BrainCircuit, 
    FileCode 
} from 'lucide-react';

// ===================================================
// Component 1A: The smallest animated table piece
// ===================================================
const TableCard = ({ title, color, delayClass }: { title: string; color: string; delayClass: string }) => (
  <div className={`table-float ${delayClass}`}>
    <div className="w-16 h-12 glass rounded-lg gradient-border shadow-lg overflow-hidden">
      <div className={`bg-gradient-to-r ${color} text-white text-[7px] px-1.5 py-0.5 font-medium border-b border-white/10`}>
        {title}
      </div>
      <div className="px-1.5 py-0.5 space-y-0.5">
        <div className="flex items-center space-x-0.5"><div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div><div className="h-0.5 w-6 bg-white/30 rounded"></div></div>
        <div className="h-0.5 w-4 bg-white/20 rounded"></div><div className="h-0.5 w-7 bg-white/20 rounded"></div>
      </div>
    </div>
  </div>
);

// ===================================================
// Component 1B: The Schema Animation for Data Governance
// ===================================================
const SchemaAnimation = () => (
    <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative animate-vertical-float-subtle">
      <div className="absolute inset-0 opacity-10"><div className="w-full h-full animate-pulse" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div></div>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 180">
        <defs><linearGradient id="connectionGradientReact" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style={{stopColor:'#4f46e5', stopOpacity:0.8}} /><stop offset="50%" style={{stopColor:'#3b82f6', stopOpacity:1}} /><stop offset="100%" style={{stopColor:'#8b5cf6', stopOpacity:0.8}} /></linearGradient></defs>
        <g stroke="url(#connectionGradientReact)" strokeWidth="1.5" fill="none"><path className="connector" d="M80,60 L140,60 L140,90 L200,90" /><path className="connector" d="M200,90 L240,90 L240,60 L280,60" /><path className="connector" d="M140,90 L140,120 L200,120" /><path className="connector" d="M200,120 L240,120 L240,150 L200,150" /><circle cx="80" cy="60" r="3" fill="#4f46e5"/><circle cx="200" cy="90" r="3" fill="#3b82f6"/><circle cx="280" cy="60" r="3" fill="#8b5cf6"/><circle cx="200" cy="120" r="3" fill="#f59e0b"/><circle cx="200"cy="150" r="3" fill="#ef4444"/></g>
      </svg>
      <div className="absolute inset-0 w-full h-full"><div className="absolute top-3 left-1/2 -translate-x-1/2 animate-schema-pulse"><div className="w-8 h-8 glass rounded-xl flex items-center justify-center border border-indigo-400/30 inner-glow"><Database className="w-4 h-4 text-indigo-400" /></div></div><div className="absolute left-3 top-12"><TableCard title="users" color="from-indigo-500/20 to-blue-500/20" delayClass="" /></div><div className="absolute right-3 top-12"><TableCard title="orders" color="from-blue-500/20 to-purple-500/20" delayClass="delay-1" /></div><div className="absolute left-1/2 -translate-x-1/2 top-24"><TableCard title="products" color="from-purple-500/20 to-pink-500/20" delayClass="delay-2" /></div><div className="absolute left-1/2 -translate-x-1/2 bottom-3"><TableCard title="analytics" color="from-orange-500/20 to-red-500/20" delayClass="delay-3" /></div></div>
    </div>
);

// ===================================================
// Component 2: The NLP to SQL Animation for "Talk to DB"
// ===================================================
const TalkToDbAnimation = () => (
    <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative animate-vertical-float-subtle">
        <div className="absolute inset-0 opacity-10"><div className="w-full h-full animate-pulse" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div></div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 180">
             <defs><linearGradient id="nlpGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style={{stopColor:'#10b981', stopOpacity:0.8}} /><stop offset="100%" style={{stopColor:'#22d3ee', stopOpacity:0.8}} /></linearGradient></defs>
            <g stroke="url(#nlpGradient)" strokeWidth="1.5" fill="none"><path className="nlp-connector-1" d="M60,90 Q 110,50 160,90" /><path className="nlp-connector-2" d="M160,90 Q 210,130 260,90" /></g>
        </svg>
        <div className="absolute inset-0 w-full h-full"><div className="absolute left-8 top-1/2 -translate-y-1/2 animate-pulse"><div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-teal-400/30 inner-glow"><User className="w-6 h-6 text-teal-300" /></div></div><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-schema-pulse"><div className="w-14 h-14 glass rounded-full flex items-center justify-center border-2 border-cyan-400/40 inner-glow"><BrainCircuit className="w-7 h-7 text-cyan-300" /></div></div><div className="absolute right-8 top-1/2 -translate-y-1/2 animate-pulse"><div className="w-12 h-12 glass rounded-full flex items-center justify-center border border-sky-400/30 inner-glow"><FileCode className="w-6 h-6 text-sky-300" /></div></div></div>
    </div>
);

// ===================================================
// Component 3: The Reusable Feature Card Shell
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
      <div className="p-4 flex-grow flex flex-col"><h3 className="text-lg font-medium text-white mb-2">{title}</h3><p className="text-white/70 mb-4 leading-relaxed text-xs flex-grow">{description}</p><div className="flex justify-between items-center mt-auto"><Link to={linkTo} className="text-indigo-400 hover:text-indigo-300 transition flex items-center text-xs font-medium glass px-3 py-1.5 rounded-lg border border-indigo-400/30">Start<ArrowRight className="w-3 h-3 ml-1" /></Link><span className="text-white/50 text-xs glass px-2 py-1 rounded-full border border-white/10">{status}</span></div></div>
    </div>
);

// ===================================================
// Component 4: The Final Page Component
// ===================================================
const DataGovernancePage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">AI Database Agents</h1>
        <p className="text-slate-400 mt-2 max-w-xl mx-auto">Leverage powerful AI agents to interact with and govern your data effortlessly.</p>
      </div>
      <div className="flex flex-wrap justify-center items-stretch gap-8">
        
        <FeatureCard
          visual={<SchemaAnimation />}
          title="Data Governance Agent"
          description="Analyze, classify, and apply masking policies to protect sensitive data with a guided, multi-step workflow."
          linkTo="/ai-agent"
          status="Live"
        />

        <FeatureCard
          visual={<TalkToDbAnimation />}
          title="Talk to DB"
          description="Ask questions in plain English and get SQL queries and data results in real-time. No SQL knowledge required."
          linkTo="/talk-to-db"
          status="Live"
        />

      </div>
    </div>
  );
};

export default DataGovernancePage;