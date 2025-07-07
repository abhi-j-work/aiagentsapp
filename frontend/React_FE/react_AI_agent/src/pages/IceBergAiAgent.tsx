import { useState, type FC } from 'react';
import {
    DatabaseZap, LoaderCircle, AlertTriangle, ScanSearch, Table, ChevronsRight,
    Shield, BarChart3, FileText, CheckCircle, Eye, BotMessageSquare
} from 'lucide-react';

// ===================================================
// MOCK API TYPES (Replace with your actual types)
// ===================================================
type SchemaProfile = {
    tableName: string;
    rowCount: number;
    sizeInGB: number;
    columns: { name: string; type: string; }[];
};
type GovernancePlan = {
    tableName: string;
    classifications: { columnName: string; classification: 'PII' | 'Sensitive' | 'Public' }[];
    suggestedPolicies: string[];
};
type VisualizationSpec = {
    type: 'bar' | 'line' | 'pie';
    title: string;
    data: { label: string; value: number }[];
};

// ===================================================
// ANIMATED SUB-COMPONENTS
// ===================================================

const SchemaProfileCard: FC<{ data: SchemaProfile }> = ({ data }) => (
    <div className="card-border p-4 rounded-lg bg-slate-900/50 animate-fade-in-slide-up">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-3"><DatabaseZap className="w-5 h-5 text-indigo-400" /> Schema & Profile</h3>
        <div className="flex justify-between text-sm mb-4 border-b border-slate-700/50 pb-3">
            <p className="text-slate-300">Rows: <span className="font-mono text-white">{data.rowCount.toLocaleString()}</span></p>
            <p className="text-slate-300">Size: <span className="font-mono text-white">{data.sizeInGB} GB</span></p>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 cascade-in">
            {data.columns.map((col, i) => (
                <li key={col.name} style={{ animationDelay: `${i * 50}ms` }} className="text-slate-300 flex items-center text-sm">
                    <ChevronsRight className="w-4 h-4 mr-2 text-indigo-500" />{col.name} <span className="ml-auto text-indigo-400/80 font-mono">{col.type}</span>
                </li>
            ))}
        </ul>
    </div>
);

const GovernanceCard: FC<{ data: GovernancePlan; onApply: () => void; isLoading: boolean }> = ({ data, onApply, isLoading }) => (
    <div className="card-border p-4 rounded-lg bg-slate-900/50 animate-fade-in-slide-up" style={{ animationDelay: '100ms' }}>
        <h3 className="font-semibold text-white flex items-center gap-2 mb-3"><Shield className="w-5 h-5 text-green-400 animate-shield-charge" /> AI Governance Plan</h3>
        <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 mb-4 cascade-in">
            {data.classifications.filter(c => c.classification !== 'Public').map((col, i) => (
                <li key={col.columnName} style={{ animationDelay: `${i * 50}ms` }} className="text-slate-300 flex items-center justify-between text-sm p-2 bg-slate-800/70 rounded-md">
                    <span>{col.columnName}</span>
                    <span className="font-medium px-2 py-0.5 rounded-full text-xs text-red-300 bg-red-900/60">{col.classification}</span>
                </li>
            ))}
        </ul>
        <button onClick={onApply} disabled={isLoading} className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition disabled:bg-slate-700 flex items-center justify-center gap-2">
            {isLoading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            {isLoading ? 'Applying...' : 'Apply Masking Policies'}
        </button>
    </div>
);

const VisualizationCard: FC<{ onGenerate: (prompt: string) => void; isLoading: boolean; chart: VisualizationSpec | null; }> = ({ onGenerate, isLoading, chart }) => {
    const [prompt, setPrompt] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(prompt);
    };

    return (
        <div className="card-border p-4 rounded-lg bg-slate-900/50 animate-fade-in-slide-up" style={{ animationDelay: '200ms' }}>
            <h3 className="font-semibold text-white flex items-center gap-2 mb-3"><BarChart3 className="w-5 h-5 text-indigo-400" /> AI Data Visualization</h3>
            <div className="h-48 flex items-center justify-center bg-slate-800/50 rounded-md mb-4">
                {isLoading && (
                    <div className="text-center text-slate-400">
                        <svg className="chart-skeleton w-32 h-32 text-slate-600" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 90V20" stroke="currentColor" strokeWidth="4"/> <path d="M30 90V40" stroke="currentColor" strokeWidth="4"/>
                            <path d="M50 90V60" stroke="currentColor" strokeWidth="4"/> <path d="M70 90V10" stroke="currentColor" strokeWidth="4"/>
                            <path d="M90 90V50" stroke="currentColor" strokeWidth="4"/>
                        </svg>
                        <p className="mt-2 text-sm">AI is drawing your chart...</p>
                    </div>
                )}
                {chart && <p className="text-white">Chart of type: {chart.type} with title "{chart.title}" would be rendered here.</p>}
                {!isLoading && !chart && <p className="text-slate-400 text-sm">Ask the AI to generate a chart.</p>}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g., 'sales by category'"
                    className="flex-grow px-3 py-2 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition" disabled={isLoading} />
                <button type="submit" disabled={isLoading || !prompt} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition disabled:bg-slate-700 flex items-center justify-center">
                    <BotMessageSquare className="w-5 h-5"/>
                </button>
            </form>
        </div>
    );
};

// ===================================================
// MAIN PAGE COMPONENT
// ===================================================
const IcebergAIAgentPage = () => {
    // UI State
    const [currentStep, setCurrentStep] = useState<'idle' | 'searching' | 'governing' | 'visualizing'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDashboard, setShowDashboard] = useState(false);

    // Data State
    const [schema, setSchema] = useState<SchemaProfile | null>(null);
    const [governancePlan, setGovernancePlan] = useState<GovernancePlan | null>(null);
    const [visualization, setVisualization] = useState<VisualizationSpec | null>(null);
    
    // MOCK API Handlers
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) { setError("Please enter a table name to search."); return; }
        
        setCurrentStep('searching');
        setError(null);
        setShowDashboard(false); // Reset dashboard on new search
        // Fake delay to simulate API call
        await new Promise(res => setTimeout(res, 1500));

        // MOCK RESPONSE
        setSchema({
            tableName: searchQuery,
            rowCount: 1_250_482,
            sizeInGB: 4.7,
            columns: [
                { name: 'user_id', type: 'BIGINT' },
                { name: 'email_address', type: 'VARCHAR' },
                { name: 'purchase_date', type: 'TIMESTAMP' },
                { name: 'product_category', type: 'VARCHAR' },
                { name: 'total_sale', type: 'DECIMAL(10,2)' },
            ]
        });
        setGovernancePlan({
            tableName: searchQuery,
            classifications: [
                { columnName: 'email_address', classification: 'PII' },
                { columnName: 'user_id', classification: 'Sensitive' },
            ],
            suggestedPolicies: ["Mask email_address", "Hash user_id"]
        });
        setVisualization(null); // Clear previous viz
        
        setShowDashboard(true);
        setCurrentStep('idle');
    };
    
    const handleApplyGovernance = async () => {
        setCurrentStep('governing');
        await new Promise(res => setTimeout(res, 1000));
        alert('Governance policies have been applied! (Mocked)');
        setCurrentStep('idle');
    };

    const handleGenerateVisualization = async (prompt: string) => {
        setCurrentStep('visualizing');
        setVisualization(null);
        await new Promise(res => setTimeout(res, 2000));
        setVisualization({
            type: 'bar',
            title: `AI Generated: ${prompt}`,
            data: [{label: 'A', value: 10}, {label: 'B', value: 20}]
        });
        setCurrentStep('idle');
    };

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center p-4 md:p-8 bg-slate-900 text-white">
            <div className="w-full max-w-5xl text-center mt-8 mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-400">
                    Data Intelligence Console
                </h1>
                <p className="mt-4 text-lg text-slate-400">
                    Use the AI Agent to search, profile, govern, and visualize your Iceberg data catalog.
                </p>
            </div>

            {/* Search Input Section */}
            <form onSubmit={handleSearch} className="w-full max-w-2xl mb-8 relative">
                <ScanSearch className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a table in the Iceberg Catalog..."
                    className="w-full pl-14 pr-4 py-4 glass rounded-full border-2 border-slate-700 text-white text-lg focus:border-indigo-500 focus:outline-none transition"
                    disabled={currentStep !== 'idle'}
                />
                <button type="submit" disabled={currentStep !== 'idle' || !searchQuery} className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-500 transition disabled:bg-slate-700 disabled:opacity-50">
                    {currentStep === 'searching' ? <LoaderCircle className="w-6 h-6 animate-spin" /> : 'Search'}
                </button>
            </form>
            
            {error && (
                <div className="flex items-center gap-3 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in-slide-up">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Results Dashboard */}
            {showDashboard && schema && governancePlan && (
                <div className="w-full max-w-6xl mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <SchemaProfileCard data={schema} />
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GovernanceCard data={governancePlan} onApply={handleApplyGovernance} isLoading={currentStep === 'governing'} />
                        <VisualizationCard onGenerate={handleGenerateVisualization} isLoading={currentStep === 'visualizing'} chart={visualization} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default IcebergAIAgentPage;  