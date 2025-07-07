import React from 'react';
import { Link } from 'react-router-dom';
import { 
    Table,      // Icon for source data
    ArrowRight  // Icon for transformation
} from 'lucide-react';

// ===================================================
// Component 1: Animated Bar (Building block for the chart)
// ===================================================
const AnimatedBar = ({ height, color, delay }: { height: string; color: string; delay: string }) => (
    <div
        className={`w-3.5 rounded-t-sm ${height} ${color} transition-all duration-1000 ease-in-out ${delay} motion-safe:animate-fade-in`}
        style={{ transformOrigin: 'bottom' }}
    />
);


// ===================================================
// Component 2: The New Visualization Animation
// ===================================================
const VisualizationAnimation = () => {
    // Inline style tag for the SVG line-drawing keyframe animation.
    // This keeps the component fully self-contained.
    const animationStyle = `
        @keyframes draw-line {
            from { stroke-dashoffset: 200; }
            to { stroke-dashoffset: 0; }
        }
        .line-chart-path {
            stroke-dasharray: 200;
            stroke-dashoffset: 200;
            animation: draw-line 2s ease-out forwards;
            animation-delay: 0.5s;
        }
    `;

    return (
        <div className="w-full h-48 rounded-xl gradient-border inner-glow overflow-hidden relative animate-vertical-float-subtle">
            <style>{animationStyle}</style>

            {/* Subtle background grid, same as the original */}
            <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full animate-pulse" style={{backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            </div>

            {/* The main animation content */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-evenly p-4">

                {/* Left side: Source Data Icon */}
                <div className="animate-schema-pulse">
                    <div className="w-12 h-12 glass rounded-xl flex items-center justify-center border border-sky-400/30 inner-glow">
                        <Table className="w-6 h-6 text-sky-400" />
                    </div>
                </div>

                {/* Middle: Transformation Arrow */}
                <div className="motion-safe:animate-fade-in motion-safe:delay-500">
                    <ArrowRight className="w-8 h-8 text-white/50" />
                </div>
                
                {/* Right side: The Generated Charts */}
                <div className="flex items-center space-x-4">
                    {/* Animated Bar Chart */}
                    <div className="w-20 h-20 glass rounded-lg flex items-end justify-center space-x-1.5 p-2 border border-white/10">
                        <AnimatedBar height="h-1/3" color="bg-cyan-400" delay="delay-200" />
                        <AnimatedBar height="h-2/3" color="bg-sky-400" delay="delay-300" />
                        <AnimatedBar height="h-full" color="bg-blue-400" delay="delay-400" />
                        <AnimatedBar height="h-1/2" color="bg-indigo-400" delay="delay-500" />
                    </div>

                    {/* Animated Line Chart using SVG */}
                    <div className="w-20 h-20 glass rounded-lg flex items-center justify-center p-2 border border-white/10">
                         <svg className="w-full h-full" viewBox="0 0 100 80">
                            <path
                                d="M 10 70 Q 25 20, 50 45 T 90 30"
                                stroke="#a78bfa" /* A nice purple from Tailwind's palette */
                                strokeWidth="4"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="line-chart-path"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ===================================================
// Component 3: The Reusable Feature Card Shell (Copied from original with your improvements)
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
// Component 4: The Final Page Component
// ===================================================
const DataVisualizationV1 = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Data Visualization AI Agent</h1>
        <p className="text-lg text-slate-300 mt-3 max-w-xl mx-auto">Transform raw data into compelling visualizations using natural language.</p>
      </div>
      <div className="flex flex-wrap justify-center items-stretch gap-8">
        
        <FeatureCard
          visual={<VisualizationAnimation />}
          title="Data Visualization Agent"
          description="Instantly generate insightful charts and dashboards. Ask questions in natural language and get stunning visualizations in return."
          linkTo="/ai-visualizer" // New link for this agent's workflow
        />

      </div>
    </div>
  );  
};

export default DataVisualizationV1;