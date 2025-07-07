import React from 'react';
import { Link } from 'react-router-dom';
import { 
    ArrowRight,
    Layers,       // Icon for Iceberg data layers
    ShieldCheck // Icon for Data Governance
} from 'lucide-react';

// ===================================================
// Component 1: The Iceberg Animation
// ===================================================
const IcebergAnimation = () => {
    return (
        <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative animate-vertical-float-subtle">
            <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            </div>

            <div className="absolute inset-0 w-full h-full flex items-center justify-evenly p-4">
                
                {/* Left side: Iceberg Layers */}
                <div className="animate-schema-pulse">
                    <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-sky-400/30 inner-glow">
                        <Layers className="w-6 h-6 text-sky-400" />
                    </div>
                </div>

                {/* Middle: Transformation Arrow */}
                <div className="motion-safe:animate-fade-in motion-safe:delay-500">
                    <ArrowRight className="w-8 h-8 text-white/50" />
                </div>
                
                {/* Right side: Governed Iceberg Data */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                    {/* The Iceberg layers */}
                    <Layers className="w-8 h-8 text-rose-300" />
                    
                    {/* The Governance shield that pops in and pulses */}
                    <ShieldCheck 
                        className="w-16 h-16 text-rose-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 motion-safe:animate-pop-in motion-safe:animate-shield-pulse"
                        style={{animationDelay: '0.8s, 1.3s'}} // Stagger pop-in and pulse
                    />
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
              className="group bg-rose-600 text-white hover:bg-rose-500 transition-all flex items-center text-sm font-semibold px-3 py-1.5 rounded-lg shadow-lg hover:shadow-rose-500/30 transform hover:-translate-y-0.5"
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
const IcebergCatalogIntroPage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Iceberg Catalog & Governance</h1>
        <p className="text-lg text-slate-300 mt-3 max-w-xl mx-auto">Apply intelligent governance directly to your Apache Iceberg data assets.</p>
      </div>
      <div className="flex flex-wrap justify-center items-stretch gap-8">
        
        <FeatureCard
          visual={<IcebergAnimation />}
          title="Iceberg Governance Agent"
          description="Connect to your Iceberg catalog to automate data classification, apply fine-grained access policies, and audit data with time-travel."
          linkTo="/iceberg-console" 
        />

      </div>
    </div>
  );  
};

export default IcebergCatalogIntroPage;