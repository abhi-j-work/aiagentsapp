import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquareQuote, Sparkles, Check } from 'lucide-react';

// ===================================================
// 1. Reusable Feature Card Component
// (Compact, Glass Effect, and Readable Fonts)
// ===================================================

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  linkTo: string;
  colorClass: string;
  glowColor: string;
};

const FeatureCard = ({ icon, title, description, features, linkTo, colorClass, glowColor }: FeatureCardProps) => (
  // The outer wrapper for the glow effect
  <div
    className="glass-card-wrapper rounded-xl"
    style={{ '--glow-color': glowColor } as React.CSSProperties}
  >
    {/* The inner card with glass effect classes */}
    <div className={`
      glass-card h-full rounded-xl p-5
      bg-slate-500/10 backdrop-blur-lg
      border border-slate-500/20
      flex flex-col
    `}>
      {/* Icon */}
      <div className={`w-11 h-11 rounded-lg bg-${colorClass}-500/10 border border-${colorClass}-500/20 flex items-center justify-center mb-4`}>
        {icon}
      </div>
      
      {/* Text Content */}
      <h3 className="text-lg font-semibold mb-2 text-white">{title}</h3>
      <p className="text-sm text-slate-400 mb-5 leading-relaxed">{description}</p>
      
      {/* Feature List */}
      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-sm text-slate-300">
            <Check className={`h-4 w-4 text-${colorClass}-400 mr-2 flex-shrink-0`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      {/* Action Link (mt-auto pushes it to the bottom) */}
      <div className="mt-auto pt-2">
        <Link 
          to={linkTo} 
          className={`inline-block w-full text-center px-4 py-2 rounded-lg bg-${colorClass}-600 text-white text-sm font-medium hover:bg-${colorClass}-700 transition-colors duration-300`}
        >
          Explore Agent
        </Link>
      </div>
    </div>
  </div>
);


// ===================================================
// 2. Main Page Component
// ===================================================

const AgentHubPage = () => {
  return (
    <>
      <style>{`
        /* CSS for glass effect and animations */
        .glass-card-wrapper {
          position: relative;
          z-index: 1;
        }
        .glass-card-wrapper::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 0.75rem; /* rounded-xl */
          padding: 1px;
          background: conic-gradient(
            from 180deg at 50% 50%,
            rgba(255, 255, 255, 0) 0deg,
            var(--glow-color) 60deg,
            var(--glow-color) 120deg,
            rgba(255, 255, 255, 0) 180deg
          );
          animation: pulseGlow 5s ease-in-out infinite;
          opacity: 0;
          transition: opacity 0.4s ease-in-out;
          z-index: -1;
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
        .glass-card-wrapper:hover::before {
          opacity: 1;
        }
        @keyframes pulseGlow {
          0%, 100% {
            transform: rotate(0deg) scale(1);
            filter: brightness(1);
          }
          50% {
            transform: rotate(180deg) scale(1.05);
            filter: brightness(1.5);
          }
        }
        @supports not (backdrop-filter: blur(12px)) {
          .glass-card {
            background-color: rgba(30, 41, 59, 0.9) !important; /* Fallback for older browsers */
          }
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
        }
      `}</style>
      
      {/* Main container with black background and purple radial gradient */}
      <div className="min-h-screen w-full bg-black bg-[radial-gradient(ellipse_50%_50%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]">
        <section className="py-20 relative text-slate-200">
          <div className="container mx-auto px-4">
            
            <div className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
              <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
                Our Suite of <span className="text-purple-400">AI-Powered Database Agents</span>
              </h2>
              <p className="text-base text-slate-400">
                Select an agent to begin transforming how you interact with and manage your data.
              </p>
            </div>
            
            {/* Grid of feature cards with reduced width */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              
              <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                <FeatureCard
                  icon={<ShieldCheck className="h-5 w-5 text-purple-400" />}
                  title="Data Governance Agent"
                  description="Analyze schema, classify PII, and automatically generate masking policies to protect your data."
                  features={["Schema Extraction", "AI Data Classification", "Automated Masking"]}
                  linkTo="/data-governance"
                  colorClass="purple"
                  glowColor="#a855f7" // Tailwind's purple-500
                />
              </div>
              
              <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                <FeatureCard
                  icon={<MessageSquareQuote className="h-5 w-5 text-cyan-400" />}
                  title="Talk to Database"
                  description="Ask questions in plain English. Our AI translates your queries into precise SQL and fetches results."
                  features={["Natural Language to SQL", "Real-Time Querying", "No SQL Knowledge Needed"]}
                  linkTo="/talk-to-db-intro"
                  colorClass="cyan"
                  glowColor="#06b6d4" // Tailwind's cyan-500
                />
              </div>

              <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                <FeatureCard
                  icon={<Sparkles className="h-5 w-5 text-amber-400" />}
                  title="Data Quality Agent"
                  description="Automatically scan tables for anomalies and inconsistencies to ensure data integrity and reliability."
                  features={["Anomaly Detection", "Duplicate Identification", "Data Cleansing Rules"]}
                  linkTo="/data-quality"
                  colorClass="amber"
                  glowColor="#f59e0b" // Tailwind's amber-500
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default AgentHubPage;