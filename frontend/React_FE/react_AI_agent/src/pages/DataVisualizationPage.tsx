import { useState } from 'react';
import { BotMessageSquare, BarChart3, PieChart, LineChart } from 'lucide-react';

const DataVisualizationPage = () => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'line' | null>(null);

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        if(!prompt) return;
        setIsGenerating(true);
        setChartType(null);
        // Mock AI thinking time
        setTimeout(() => {
            if (prompt.toLowerCase().includes('pie')) setChartType('pie');
            else if (prompt.toLowerCase().includes('line') || prompt.toLowerCase().includes('trend')) setChartType('line');
            else setChartType('bar');
            setIsGenerating(false);
        }, 2000);
    }
    
    const ChartPlaceholder = () => (
        <div className="text-center text-slate-500">
            <BarChart3 className="w-20 h-20 mx-auto mb-4"/>
            <p>Your generated insight will appear here.</p>
        </div>
    );

    const ChartSkeleton = () => (
         <svg className="w-full h-full text-slate-700" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 70V20 H20 V70 H10Z" stroke="currentColor" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0s'}}/> 
            <path d="M30 70V40 H40 V70 H30Z" stroke="currentColor" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0.2s'}}/>
            <path d="M50 70V60 H60 V70 H50Z" stroke="currentColor" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0.4s'}}/>
            <path d="M70 70V10 H80 V70 H70Z" stroke="currentColor" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0.6s'}}/>
            <path d="M5 72 H95" stroke="currentColor" strokeWidth="1" />
        </svg>
    );
    
    const RenderedChart = ({ type }: { type: 'bar' | 'pie' | 'line' }) => (
        <div className="w-full h-full flex items-center justify-center animate-pop-in">
           {type === 'bar' && <BarChart3 className="w-24 h-24 text-purple-400"/>}
           {type === 'pie' && <PieChart className="w-24 h-24 text-purple-400"/>}
           {type === 'line' && <LineChart className="w-24 h-24 text-purple-400"/>}
           <p className="ml-4 text-lg text-slate-300">Displaying AI-generated {type} chart.</p>
        </div>
    );

    return (
        <div className="animate-fade-in-slide-up">
            <h1 className="text-3xl font-bold mb-2">Data Visualization Studio</h1>
            <p className="text-slate-400 mb-8">Generate charts and discover insights using natural language prompts.</p>

            <div className="bg-slate-900/50 p-6 rounded-lg">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-white">Your Prompt</h3>
                        <p className="text-sm text-slate-400">Describe the insight you're looking for. The AI Agent will select the best chart type and generate the visualization from your Iceberg data.</p>
                        <form onSubmit={handleGenerate}>
                            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., 'Show total sales by product category as a bar chart'" rows={3}
                                className="w-full p-3 glass rounded-lg border-2 border-slate-700 text-white focus:border-purple-500 focus:outline-none transition" />
                            <button type="submit" disabled={isGenerating || !prompt} className="w-full mt-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-500 transition flex items-center justify-center gap-2 disabled:bg-slate-700">
                                <BotMessageSquare className="w-5 h-5" /> {isGenerating ? 'AI is Thinking...' : 'Generate Insight'}
                            </button>
                        </form>
                    </div>
                    <div className="min-h-[300px] flex items-center justify-center bg-slate-800/50 rounded-lg p-4">
                        {isGenerating ? <ChartSkeleton /> : (chartType ? <RenderedChart type={chartType}/> : <ChartPlaceholder />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataVisualizationPage;