import { useState, type FC, type ReactNode } from 'react';
import {
    Database, LoaderCircle, AlertTriangle, ScanSearch, Table, ChevronsRight,
    ShieldCheck, BarChartHorizontalBig, Eye, BotMessageSquare, Sparkles, Share2, Server, KeyRound
} from 'lucide-react';

// ===================================================
// MOCK DATA & TYPES (Replace with your actual API calls and types)
// ===================================================
type TableSchema = {
    name: string;
    description: string;
    columns: { name: string; type: string; description: string }[];
    lineage: { upstream: string[]; downstream: string[] };
};

// ===================================================
// Reusable UI Components
// ===================================================
const Card = ({ children, className = '' }: { children: ReactNode, className?: string }) => (
    <div className={`card-border bg-slate-900/50 rounded-lg p-6 ${className}`}>
        {children}
    </div>
);

const TabButton: FC<{ active: boolean; onClick: () => void; children: ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700/50'}`}>
        {children}
    </button>
);

// ===================================================
// Module 1: Schema Explorer
// ===================================================
const SchemaExplorer: FC<{ schema: TableSchema | null }> = ({ schema }) => {
    if (!schema) return <div className="text-center py-10 text-slate-400">Search for a table to explore its schema.</div>;
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-slide-up">
            <Card className="lg:col-span-1">
                <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Table className="w-5 h-5 text-indigo-400" /> Columns</h3>
                <ul className="space-y-2 max-h-96 overflow-y-auto pr-2 cascade-in">
                    {schema.columns.map((col, i) => (
                        <li key={col.name} style={{ animationDelay: `${i * 40}ms` }} className="p-2 bg-slate-800/60 rounded-md">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-200 font-medium">{col.name}</span>
                                <span className="text-indigo-400/80 font-mono text-xs">{col.type}</span>
                            </div>
                            <p className="text-slate-400 text-xs mt-1">{col.description}</p>
                        </li>
                    ))}
                </ul>
            </Card>
            <Card className="lg:col-span-2 space-y-6">
                <div>
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-2"><Sparkles className="w-5 h-5 text-indigo-400" /> AI Generated Summary</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{schema.description}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Share2 className="w-5 h-5 text-indigo-400" /> AI Generated Lineage</h3>
                    <div className="flex items-center justify-around text-center text-sm">
                        <div className="space-y-2 cascade-in">
                            <h4 className="font-semibold text-slate-400">Upstream</h4>
                            {schema.lineage.upstream.map((up, i) => <div key={up} style={{ animationDelay: `${i*100}ms`}} className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-md"><Server className="w-4 h-4 text-slate-500"/>{up}</div>)}
                        </div>
                        <svg className="w-32 h-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 50 L95 50" stroke="#4f46e5" strokeWidth="2" className="line-draw-path" style={{animation: 'line-draw 1s forwards'}}/>
                        </svg>
                        <div className="bg-indigo-600 p-3 rounded-lg shadow-lg">
                            <p className="font-bold text-white">{schema.name}</p>
                        </div>
                        <svg className="w-32 h-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 50 L95 50" stroke="#4f46e5" strokeWidth="2" className="line-draw-path" style={{animation: 'line-draw 1s 0.5s forwards'}}/>
                        </svg>
                        <div className="space-y-2 cascade-in">
                             <h4 className="font-semibold text-slate-400">Downstream</h4>
                            {schema.lineage.downstream.map((down, i) => <div key={down} style={{ animationDelay: `${i*100}ms`}} className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-md"><Eye className="w-4 h-4 text-slate-500"/>{down}</div>)}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// ===================================================
// Module 2: Governance Workbench
// ===================================================
const GovernanceWorkbench: FC<{ tableName: string | null }> = ({ tableName }) => {
    const [isMasked, setIsMasked] = useState(false);
    if (!tableName) return <div className="text-center py-10 text-slate-400">Select a table from the Schema Explorer to view its governance plan.</div>;
    
    // MOCK DATA
    const classifications = [
        { name: 'user_id', classification: 'Sensitive' },
        { name: 'email_address', classification: 'PII' },
        { name: 'purchase_date', classification: 'Public' },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-slide-up">
            <Card>
                <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><ShieldCheck className="w-5 h-5 text-green-400 animate-shield-charge" /> AI Data Classification</h3>
                <ul className="space-y-2 cascade-in">
                    {classifications.map((col, i) => (
                        <li key={col.name} style={{ animationDelay: `${i * 100}ms` }} className="p-2 bg-slate-800/60 rounded-md flex justify-between items-center animate-pop-in">
                            <span className="text-slate-200 font-medium">{col.name}</span>
                            {col.classification !== 'Public' && <span className="font-medium px-2 py-0.5 rounded-full text-xs text-red-300 bg-red-900/60 flex items-center gap-1"><KeyRound className="w-3 h-3"/>{col.classification}</span>}
                        </li>
                    ))}
                </ul>
            </Card>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2"><Eye className="w-5 h-5 text-indigo-400" /> Masked Data Preview</h3>
                    <label className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm font-medium text-slate-300">Mask Data</span>
                        <div className="relative">
                            <input type="checkbox" checked={isMasked} onChange={() => setIsMasked(!isMasked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </div>
                    </label>
                </div>
                <div className="font-mono text-sm bg-slate-950/70 p-4 rounded-md overflow-x-auto">
                    <p className="text-slate-400">SELECT user_id, email_address, purchase_date FROM {tableName} LIMIT 1;</p>
                    <div className="mt-4 text-slate-200 relative">
                        <p>12345, <span className="relative inline-block">{isMasked && <span className="redacted-text"></span>}john.doe@email.com</span>, 2023-10-27</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// ===================================================
// Module 3: AI Visualization Studio
// ===================================================
const VisualizationStudio: FC<{ tableName: string | null }> = ({ tableName }) => {
    if (!tableName) return <div className="text-center py-10 text-slate-400">Select a table from the Schema Explorer to visualize its data.</div>;
    return (
         <Card className="animate-fade-in-slide-up">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><BarChartHorizontalBig className="w-5 h-5 text-indigo-400" /> Visualization Studio</h3>
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                     <p className="text-sm text-slate-300">Use natural language to ask the AI Agent to generate a chart from the <span className="font-semibold text-indigo-400">{tableName}</span> table.</p>
                     <textarea placeholder="e.g., 'Show me total sales by product category as a bar chart over the last quarter...'" rows={4} className="w-full p-3 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition"></textarea>
                     <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition flex items-center justify-center gap-2">
                         <BotMessageSquare className="w-5 h-5" /> Generate Insight
                     </button>
                </div>
                <div className="flex-1 min-h-[200px] flex items-center justify-center bg-slate-800/50 rounded-md p-4">
                     <div className="text-center text-slate-400">
                        <svg className="w-48 h-48 text-slate-600" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 90V20 H20 V90 H10Z" stroke="currentColor" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0s'}}/> 
                            <path d="M30 90V40 H40 V90 H30Z" stroke="currentColor" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0.2s'}}/>
                            <path d="M50 90V60 H60 V90 H50Z" stroke="currentColor" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0.4s'}}/>
                            <path d="M70 90V10 H80 V90 H70Z" stroke="currentColor" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0.6s'}}/>
                            <path d="M0 92 H100" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        <p className="mt-2 text-sm">Awaiting your command...</p>
                    </div>
                </div>
            </div>
         </Card>
    );
};

// ===================================================
// Main Page Component
// ===================================================
const DataIntelligenceConsole = () => {
    const [activeTab, setActiveTab] = useState<'schema' | 'governance' | 'visualization'>('schema');
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTable, setSelectedTable] = useState<TableSchema | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSelectedTable(null);
        await new Promise(res => setTimeout(res, 1000)); // Mock API call
        
        // MOCK RESPONSE
        setSelectedTable({
            name: searchQuery,
            description: `The ${searchQuery} table is a critical asset containing customer transaction records, including user identifiers, email addresses for communication, and detailed sales figures. It is frequently joined with the 'users' and 'products' tables to build analytical dashboards.`,
            columns: [
                { name: 'user_id', type: 'BIGINT', description: 'Unique identifier for the user.' },
                { name: 'email_address', type: 'VARCHAR', description: 'Contact email of the user.' },
                { name: 'purchase_date', type: 'TIMESTAMP', description: 'When the purchase was made.' },
                { name: 'product_category', type: 'VARCHAR', description: 'Category of the product purchased.' },
                { name: 'total_sale', type: 'DECIMAL', description: 'The total amount of the sale.' },
            ],
            lineage: {
                upstream: ['users_raw', 'products_dim'],
                downstream: ['sales_dashboard', 'marketing_report']
            }
        });
        
        setIsLoading(false);
        setActiveTab('schema'); // Focus on schema tab after search
    };

    return (
        <div className="min-h-screen w-full bg-slate-900 text-white p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-400">
                        Data Intelligence Console
                    </h1>
                    <p className="mt-2 text-md text-slate-400">AI-Powered Catalog for Metadata, Governance & Visualization</p>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto mb-8 relative">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a table... (e.g., 'customer_sales')"
                        className="w-full pl-4 pr-24 py-3 glass rounded-full border-2 border-slate-700 text-white focus:border-indigo-500 focus:outline-none transition" />
                    <button type="submit" disabled={isLoading} className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-500 transition disabled:bg-slate-700 ${!isLoading && searchQuery && 'animate-scan-pulse'}`}>
                        {isLoading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Search'}
                    </button>
                </form>

                {/* Tabs & Content */}
                {selectedTable && (
                     <div className="animate-fade-in-slide-up">
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center space-x-2 p-1.5 bg-slate-800/70 rounded-lg">
                                <TabButton active={activeTab === 'schema'} onClick={() => setActiveTab('schema')}><Database className="w-4 h-4"/>Schema Explorer</TabButton>
                                <TabButton active={activeTab === 'governance'} onClick={() => setActiveTab('governance')}><ShieldCheck className="w-4 h-4"/>Governance Workbench</TabButton>
                                <TabButton active={activeTab === 'visualization'} onClick={() => setActiveTab('visualization')}><BarChartHorizontalBig className="w-4 h-4"/>Visualization Studio</TabButton>
                            </div>
                        </div>
                        
                        <div>
                            {activeTab === 'schema' && <SchemaExplorer schema={selectedTable} />}
                            {activeTab === 'governance' && <GovernanceWorkbench tableName={selectedTable?.name || null} />}
                            {activeTab === 'visualization' && <VisualizationStudio tableName={selectedTable?.name || null} />}
                        </div>
                    </div>
                )}
                 {!selectedTable && !isLoading && (
                    <div className="text-center text-slate-500 mt-20 animate-fade-in-slide-up">
                        <Server className="w-16 h-16 mx-auto mb-4"/>
                        <p>Your Iceberg catalog is ready.</p>
                        <p>Begin by searching for a data asset.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataIntelligenceConsole;