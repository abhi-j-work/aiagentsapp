import { BotMessageSquare, Database, Sparkles, LoaderCircle } from 'lucide-react';

// ===================================================
// New Reusable Component for the Background
// ===================================================
const HolographicBackground = () => {
  const createWavePath = (amplitude: number, frequency: number, phase: number) => {
    let path = `M -200 50`;
    for (let i = -200; i <= 300; i += 2) {
      const y = 50 + Math.sin((i + phase) * frequency) * amplitude;
      path += ` C ${i - 1} ${y}, ${i + 1} ${y}, ${i} ${y}`;
    }
    return path;
  };

  const waves = [
    { color: '#6366f1', opacity: 0.2, amp: 20, freq: 0.02, phase: 10, duration: '20s' },
    { color: '#818cf8', opacity: 0.3, amp: 25, freq: 0.015, phase: 20, duration: '30s' },
    { color: '#a5b4fc', opacity: 0.2, amp: 15, freq: 0.025, phase: 30, duration: '25s' },
    { color: '#22d3ee', opacity: 0.1, amp: 30, freq: 0.01, phase: 40, duration: '40s' },
  ];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black">
      <svg className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <filter id="hologlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g style={{ filter: 'url(#hologlow)' }}>
          {waves.map((wave, index) => (
            <path
              key={index}
              d={createWavePath(wave.amp, wave.freq, wave.phase)}
              fill="none"
              stroke={wave.color}
              strokeWidth="1.5"
              strokeOpacity={wave.opacity}
              style={{ animation: `wave-flow ${wave.duration} linear infinite alternate` }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};


// ===================================================
// The Main Page Component
// ===================================================
const DataVisualizationPage = () => {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden">
      <HolographicBackground />

      {/* Main content sits on top with a relative z-index */}
      <div className="relative z-10 animate-fade-in-up w-full max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-12 text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            AI Visualization Studio
          </h1>
          <p className="max-w-xl text-slate-300 mt-2">
            This creative workspace is being fine-tuned. Soon, you'll be able to generate complex data visualizations from simple natural language prompts.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left Control Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 bg-black/20 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-lg shadow-indigo-500/5">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-slate-400"/>1. Select Data Source
              </h3>
              <select disabled className="w-full p-2.5 bg-slate-900/70 rounded-md border border-slate-700 text-slate-300 cursor-not-allowed appearance-none">
                <option>customer_sales_iceberg</option>
              </select>
            </div>

            <div className="p-5 bg-black/20 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-lg shadow-indigo-500/5">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                <BotMessageSquare className="w-4 h-4 text-slate-400"/>2. Write Your Prompt
              </h3>
              <textarea
                disabled
                rows={4}
                placeholder="e.g., 'What is the trend of sales amount by product category for the last 6 months?'"
                className="w-full p-2.5 bg-slate-900/70 rounded-md border border-slate-700 text-slate-300 cursor-not-allowed placeholder-slate-600 resize-none"
              ></textarea>
            </div>

            <div className="p-5 bg-black/20 backdrop-blur-md rounded-xl border border-slate-700/50 shadow-lg shadow-indigo-500/5">
              <h3 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-slate-400"/>3. AI Log
              </h3>
              <div className="font-mono text-xs text-indigo-200 bg-black/50 p-3 rounded-md h-28">
                <p className="typing-text" style={{animationDelay: '1s'}}> AI Agent activated...</p>
                <p className="typing-text" style={{animationDelay: '3s'}}> Calibrating visualization matrix...</p>
                <p className="typing-text" style={{animationDelay: '5s'}}> Awaiting user input...</p>
              </div>
            </div>
          </div>

          {/* Right "Holographic" Display */}
          <div className="lg:col-span-3 min-h-[50vh] flex flex-col items-center justify-center p-6 bg-black/20 backdrop-blur-sm rounded-xl border border-slate-700/50">
            <div className="flex-grow flex items-center justify-center w-full">
              <h2 className="text-xl font-medium tracking-widest text-slate-400 animate-text-focus-in animate-subtle-pulse">
                SYSTEM CALIBRATION IN PROGRESS
              </h2>
            </div>
            
            <button disabled className="mt-auto px-4 py-2 bg-slate-800/80 text-slate-500 rounded-md text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-700">
              <LoaderCircle className="w-4 h-4" />
              Generating Interface
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataVisualizationPage;    