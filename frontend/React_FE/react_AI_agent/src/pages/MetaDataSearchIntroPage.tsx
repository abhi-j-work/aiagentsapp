import React from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowRight,
    ScanSearch, // Icon for search query
    Table,      // Icon for the found table
    FileText,   // Icon for schema/docs
    Share2      // Icon for lineage
} from 'lucide-react';

// ===================================================
// Component 1: The Metadata Animation
// ===================================================
const MetadataAnimation = () => {
    // Self-contained styles for this specific animation
    const animationStyle = `
        @keyframes draw-line { to { stroke-dashoffset: 0; } }
        .line-path {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: draw-line 1.5s ease-out forwards;
        }
    `;

    return (
        <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative animate-vertical-float-subtle">
            <style>{animationStyle}</style>
            <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            </div>

            <div className="absolute inset-0 w-full h-full flex items-center justify-evenly p-4">
                
                {/* Left side: Search Icon */}
                <div className="animate-schema-pulse">
                    <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-sky-400/30 inner-glow">
                        <ScanSearch className="w-6 h-6 text-sky-400" />
                    </div>
                </div>

                {/* Middle: Transformation Arrow */}
                <div className="motion-safe:animate-fade-in motion-safe:delay-500">
                    <ArrowRight className="w-8 h-8 text-white/50" />
                </div>
                
                {/* Right side: Discovered Metadata */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* The discovered table */}
                    <Table className="w-10 h-10 text-blue-300" />
                    
                    {/* Animated SVG for lineage lines */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100">
                        {/* Line to Docs */}
                        <path d="M 50 50 L 85 15" stroke="#a78bfa" strokeWidth="1.5" className="line-path" style={{ animationDelay: '0.5s' }} />
                        {/* Line to Lineage */}
                        <path d="M 50 50 L 85 85" stroke="#a78bfa" strokeWidth="1.5" className="line-path" style={{ animationDelay: '0.8s' }} />
                         {/* Line to other metadata */}
                        <path d="M 50 50 L 15 85" stroke="#a78bfa" strokeWidth="1.5" className="line-path" style={{ animationDelay: '1.1s' }} />
                    </svg>

                    {/* Icons representing the discovered metadata */}
                    <FileText className="w-5 h-5 text-purple-400 absolute top-0 right-0 motion-safe:animate-pop-in" style={{animationDelay: '1.5s'}} />
                    <Share2 className="w-5 h-5 text-purple-400 absolute bottom-0 right-0 motion-safe:animate-pop-in" style={{animationDelay: '1.8s'}} />
                </div>
            </div>
        </div>
    );
};

// ===================================================
// Reusable Feature Card Shell (Copied from your example)
// ===================================================
const FeatureCard = ({ visual, title, description, linkTo }: { visual: React.ReactNode; title: string; description: string; linkTo: string; }) => (
    <div className="relative card-border overflow-hidden rounded-2xl flex flex-col animate-vertical-float w-full max-w-xs mx-auto">
      <div className="p-4 flex justify-center relative">{visual}</div>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      <div className="p-5 flex-grow flex flex-col">
        <h3 className="text-xl font-medium text-white mb-2">{title}</h3>
        <p className="text-slate-300 mb-4 leading-relaxed text-sm flex-grow">{description}</p>
        <div className="flex justify-between items-center mt-auto">
           <Link 
              to={linkTo} 
              className="group bg-sky-600 text-white hover:bg-sky-500 transition-all flex items-center text-sm font-semibold px-3 py-1.5 rounded-lg shadow-lg hover:shadow-sky-500/30 transform hover:-translate-y-0.5"
            >
                Start
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
        </div>
      </div>
    </div>
);

// ===================================================
// Final Page Component
// ===================================================
const MetaDataSearchIntroPage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">AI Metadata Search</h1>
        <p className="text-lg text-slate-300 mt-3 max-w-xl mx-auto">Discover, understand, and get AI-powered documentation for your data assets.</p>
      </div>
      <div className="flex flex-wrap justify-center items-stretch gap-8">
        
        <FeatureCard
          visual={<MetadataAnimation />}
          title="Metadata Discovery Agent"
          description="Explore your data catalog with smart search. Get AI-generated summaries, column details, and visual data lineage instantly."
          linkTo="/metadata-console" 
        />

      </div>
    </div>
  );  
};

export default MetaDataSearchIntroPage;