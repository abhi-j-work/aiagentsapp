import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MessageSquareQuote, Sparkles, Check } from 'lucide-react';

// ===================================================
// 1. Reusable Feature Card Component (with the fix)
// ===================================================

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  linkTo: string;
  colorClass: string;
};

const FeatureCard = ({ icon, title, description, features, linkTo, colorClass }: FeatureCardProps) => (
  // THE FIX IS IN THIS LINE:
  // - Changed background to bg-slate-900 for more contrast.
  // - Added a subtle hover:bg-slate-800/50 for interaction.
  // - Kept the gradient-bg to apply a colored glow on hover.
  // - Strengthened the border to border-slate-800.
  <div className={`
    bg-slate-900 rounded-xl border border-slate-800 p-6 
    hover:border-${colorClass}-500/50 transition-colors duration-300 
    gradient-bg flex flex-col hover:bg-slate-800/50
  `}>
    {/* Icon */}
    <div className={`w-12 h-12 rounded-lg bg-${colorClass}-500/20 flex items-center justify-center mb-4`}>
      {icon}
    </div>
    
    {/* Text Content */}
    <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
    <p className="text-slate-400 text-base mb-4 flex-grow">{description}</p>
    
    {/* Feature List */}
    <ul className="space-y-2 mb-6">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center text-sm text-slate-300">
          <Check className={`h-4 w-4 text-${colorClass}-400 mr-2 flex-shrink-0`} />
          {feature}
        </li>
      ))}
    </ul>
    
    {/* Action Link */}
    <div className="mt-auto">
      <Link to={linkTo} className={`inline-block px-5 py-2 rounded-lg bg-${colorClass}-600 text-white text-sm font-medium hover:bg-${colorClass}-700 transition-colors`}>
        Explore Agent
      </Link>
    </div>
  </div>
);

// ===================================================
// 2. Main Page Component (No changes needed here)
// ===================================================

const AgentHubPage = () => {
  return (
    <>
      <style>{`
        /* ... your existing styles ... */
        .gradient-bg {
          /* Make the gradient more visible on hover */
          background-size: 200% 200%;
          background-position: 100% 100%;
          transition: background-position 0.5s ease-in-out;
        }
        .gradient-bg:hover {
          background-position: 0% 0%;
        }
      `}</style>
      
      {/* UPDATE to use a darker body background for better contrast */}
      <div className="bg-slate-950">
        <section className="py-20 relative overflow-hidden text-slate-200">
          <div className="container mx-auto px-4">
            
            <div className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
              <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
                Our Suite of <span className="text-cyan-400">AI-Powered Database Agents</span>
              </h2>
              <p className="text-base text-slate-400">
                Select an agent to begin transforming how you interact with and manage your data.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                <FeatureCard
                  icon={<ShieldCheck className="h-6 w-6 text-purple-400" />}
                  title="Data Governance Agent"
                  description="Analyze schema, classify sensitive data, and automatically generate and apply masking policies to protect your data."
                  features={["Schema Extraction", "AI Data Classification", "Automated SQL Masking"]}
                  linkTo="/data-governance"
                  colorClass="purple"
                />
              </div>
              
              <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                <FeatureCard
                  icon={<MessageSquareQuote className="h-6 w-6 text-cyan-400" />}
                  title="Talk to Database"
                  description="Ask questions in plain English. Our AI translates your queries into precise SQL and fetches the results instantly."
                  features={["Natural Language to SQL", "Real-Time Querying", "No SQL Knowledge Needed"]}
                  linkTo="/talk-to-db-intro"
                  colorClass="cyan"
                />
              </div>

              <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                <FeatureCard
                  icon={<Sparkles className="h-6 w-6 text-amber-400" />}
                  title="Data Quality Agent"
                  description="Automatically scan your tables for anomalies, inconsistencies, and duplicates to ensure data integrity and reliability."
                  features={["Anomaly Detection", "Duplicate Identification", "Data Cleansing Rules"]}
                  linkTo="/data-quality-intro"
                  colorClass="amber"
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