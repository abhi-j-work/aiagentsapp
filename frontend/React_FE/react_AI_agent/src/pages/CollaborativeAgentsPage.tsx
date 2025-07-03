import React from 'react';
import { Link } from 'react-router-dom';
import { 
    Database, 
    ArrowRight,
    User,
    BrainCircuit,
    FileCode,
    MessageSquareQuote,
    Shield
} from 'lucide-react';

// ===================================================
// Animations (Size Reduced)
// ===================================================

const SchemaAnimation = () => (
    // CHANGED: Height reduced from h-48 to h-40 for a more compact card
    <div className="w-full h-40 rounded-xl gradient-border inner-glow overflow-hidden relative">
      <div className="absolute inset-0 opacity-10"><div className="w-full h-full" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div></div>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 160"> {/* Viewbox height adjusted */}
        <defs><linearGradient id="connectionGradientReact" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style={{stopColor:'#8b5cf6', stopOpacity:0.8}} /><stop offset="100%" style={{stopColor:'#ec4899', stopOpacity:0.8}} /></linearGradient></defs>
        <g stroke="url(#connectionGradientReact)" strokeWidth="1.5" fill="none"><path d="M160,25 L160,55 L80,55" /><path d="M160,55 L240,55" /><path d="M160,85 L160,115" /><circle cx="160" cy="25" r="3" fill="#8b5cf6"/><circle cx="80" cy="55" r="3" fill="#a855f7"/><circle cx="240" cy="55" r="3" fill="#d946ef"/><circle cx="160" cy="115" r="3" fill="#ec4899"/></g>
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-schema-pulse">
        <div className="w-10 h-10 glass rounded-full flex items-center justify-center border border-purple-400/30 inner-glow"><Database className="w-5 h-5 text-purple-300" /></div>
      </div>
    </div>
);

const TalkToDbAnimation = () => (
    // CHANGED: Height reduced from h-48 to h-40
    <div className="w-full h-40 rounded-xl gradient-border inner-glow overflow-hidden relative">
        <div className="absolute inset-0 opacity-10"><div className="w-full h-full" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div></div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 160"> {/* Viewbox height adjusted */}
             <defs><linearGradient id="nlpGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style={{stopColor:'#10b981', stopOpacity:0.8}} /><stop offset="100%" style={{stopColor:'#22d3ee', stopOpacity:0.8}} /></linearGradient></defs>
            <g stroke="url(#nlpGradient)" strokeWidth="1.5" fill="none"><path className="nlp-connector-1" d="M60,80 Q 110,40 160,80" /><path className="nlp-connector-2" d="M160,80 Q 210,120 260,80" /></g>
        </svg>
        <div className="absolute inset-0 w-full h-full">
            <div className="absolute left-8 top-1/2 -translate-y-1/2"><div className="w-11 h-11 glass rounded-full flex items-center justify-center border border-teal-400/30 inner-glow"><User className="w-5 h-5 text-teal-300" /></div></div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-schema-pulse"><div className="w-12 h-12 glass rounded-full flex items-center justify-center border-2 border-cyan-400/40 inner-glow"><BrainCircuit className="w-6 h-6 text-cyan-300" /></div></div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2"><div className="w-11 h-11 glass rounded-full flex items-center justify-center border border-sky-400/30 inner-glow"><FileCode className="w-5 h-5 text-sky-300" /></div></div>
        </div>
    </div>
);


// ===================================================
// Component 2: Agent Card (Size Reduced)
// ===================================================
type AgentCardProps = {
  visual: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  description: string;
  linkTo?: string;
  buttonColor?: string;
};

const AgentCard = ({ visual, icon, title, description, linkTo, buttonColor }: AgentCardProps) => (
    // CHANGED: Max width reduced from max-w-sm to max-w-xs for a smaller card
    <div className="relative card-border overflow-hidden rounded-2xl flex flex-col w-full max-w-xs mx-auto animate-vertical-float">
        <div className="p-4 flex justify-center relative">{visual}</div>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        {/* CHANGED: Padding reduced from p-6 to p-5 */}
        <div className="p-5 flex-grow flex flex-col">
            <div className="flex items-center gap-3 mb-3">
                {icon}
                {/* CHANGED: Title font size reduced from text-xl to text-lg */}
                <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            {/* CHANGED: Description font size reduced from text-base to text-sm */}
            <p className="text-sm text-slate-300 mb-5 leading-relaxed flex-grow">{description}</p>
            {linkTo && buttonColor && (
                <div className="mt-auto">
                    <Link to={linkTo} className={`group w-full text-white transition-all flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-lg shadow-lg transform hover:-translate-y-0.5 ${buttonColor}`}>
                        Start Agent
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                </div>
            )}
        </div>
    </div>
);


// ===================================================
// Component 3: Heartbeat Connector (No changes needed)
// ===================================================
const HeartbeatConnector = () => (
    <div className="w-full lg:w-32 h-20 lg:h-full flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 160 80">
            <path d="M 0 40 L 40 40 L 50 20 L 70 60 L 80 40 L 120 40 L 160 40" stroke="url(#heartbeatGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" className="heartbeat-path" />
            <defs>
                <linearGradient id="heartbeatGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#a855f7" /></linearGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <use href="#heartbeat-path" filter="url(#glow)" />
        </svg>
    </div>
);


// ===================================================
// Component 4: The Final Unified Page
// ===================================================
const CollaborativeAgentsPage = () => {
  return (
    <>
    <style>{`
        .heartbeat-path { stroke-dasharray: 250; stroke-dashoffset: 250; animation: draw-heartbeat 2.5s ease-in-out infinite; }
        @keyframes draw-heartbeat { 0% { stroke-dashoffset: 250; } 40% { stroke-dashoffset: 0; } 80% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -250; } }
    `}</style>
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Agent-to-Agent Communication</h1>
        <p className="text-lg text-slate-300 mt-4 max-w-3xl mx-auto">
            Our AI agents don't work in silos. They communicate and collaborate to provide smarter, safer results. Here's how the **Talk to DB** agent consults the **Governance** agent.
        </p>
      </div>
      
      {/* 
        CHANGED: A new wrapper div with a blurred background now encloses the entire scene.
        This creates a "spotlight" effect, making the connector highly visible.
      */}
      <div className="relative flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-0 rounded-3xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-md">
        
        <AgentCard
          visual={<TalkToDbAnimation />}
          icon={<MessageSquareQuote className="w-6 h-6 text-cyan-400" />}
          title="Talk to DB Agent"
          description="A user asks a question. The agent translates it to SQL and prepares to query the database."
          linkTo="/talk-to-db"
          buttonColor="bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/30 hover:shadow-cyan-500/40"
        />

        <HeartbeatConnector />
        
        <AgentCard
          visual={<SchemaAnimation />}
          icon={<Shield className="w-6 h-6 text-purple-400" />}
          title="Data Governance Agent"
          description="It receives the query, checks it against its PII classification rules, and returns a safety clearance or suggests data masking."
        />

      </div>
    </div>
    </>
  );
};

export default CollaborativeAgentsPage;