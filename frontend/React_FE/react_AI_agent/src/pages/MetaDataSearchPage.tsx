import React, { useState } from 'react';
import { LoaderCircle, ScanSearch, Server, Table, ChevronsRight, Share2, Eye, Sparkles } from 'lucide-react';

// ===================================================
// Reusable Sub-Components
// ===================================================
const GlassPanel = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-slate-900/40 backdrop-blur-md p-6 rounded-xl border border-slate-700/50 shadow-lg ${className}`}>
        {children}
    </div>
);

const LineageNode = ({ icon: Icon, label, delay }: { icon: React.ElementType, label: string, delay: string }) => (
    <div className="flex flex-col items-center gap-2 animate-pop-in" style={{ animationDelay: delay }}>
        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-700">
            <Icon className="w-6 h-6 text-slate-400" />
        </div>
        <span className="text-xs font-semibold text-slate-300">{label}</span>
    </div>
);

// ===================================================
// Mock Data
// ===================================================
const MOCK_SCHEMA = {
  name: "customer_sales",
  description: "This table is the source of truth for all customer transactions. It contains sensitive PII and financial data, and is governed by the 'Sales Data' policy. The data is updated daily via an ETL process from the staging tables.",
  columns: [
    { name: 'sale_id', type: 'UUID' }, { name: 'customer_email', type: 'VARCHAR' }, { name: 'product_sku', type: 'VARCHAR' },
    { name: 'sale_amount', type: 'DECIMAL' }, { name: 'transaction_date', type: 'TIMESTAMP' }, { name: 'payment_method', type: 'VARCHAR' },
  ],
  lineage: { upstream: ['stg_orders', 'dim_customers'], downstream: ['rpt_quarterly_sales', 'agg_customer_ltv'] }
};


// ===================================================
// The Main Page Component
// ===================================================
const MetadataSearchPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [result, setResult] = useState<typeof MOCK_SCHEMA | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        setIsLoading(true);
        setResult(null);
        setTimeout(() => {
            setResult(MOCK_SCHEMA);
            setIsLoading(false);
        }, 1500);
    };

    return (
        // Correct Full-Screen Layout Fix
        <div className="relative min-h-screen w-full flex flex-col p-4 sm:p-6 md:p-8 overflow-hidden">
            {/* Animated Grid Background */}
            <div 
              className="absolute inset-0 z-0 opacity-20 animate-grid-pan"
              style={{
                backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}
            ></div>

            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col flex-grow">
                {/* Header */}
                <header className="animate-fade-in-up">
                    <h1 className="text-3xl font-bold mb-2 text-white">Metadata Discovery</h1>
                    <p className="text-slate-400 mb-8">Explore your data universe. Use the AI Agent to instantly discover, document, and understand data assets.</p>

                    <form onSubmit={handleSearch} className="max-w-xl mb-10 relative">
                        <ScanSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/>
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for a table by name, e.g., 'customer_sales'"
                            className="w-full pl-12 pr-28 py-3 glass rounded-lg border-2 border-slate-700 text-white focus:border-indigo-500 focus:outline-none transition" />
                        <button type="submit" disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-500 transition disabled:bg-slate-700">
                            {isLoading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Search'}
                        </button>
                    </form>
                </header>

                {/* Content Area */}
                <main className="flex-grow flex items-center justify-center">
                    {isLoading && (
                        <div className="flex flex-col items-center text-slate-400 animate-fade-in-up">
                            <LoaderCircle className="w-16 h-16 mb-4 animate-spin text-indigo-500"/>
                            <p className="text-lg">AI Agent is scanning the dataverse...</p>
                        </div>
                    )}

                    {result && (
                        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            <GlassPanel className="lg:col-span-1">
                                <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Table className="w-5 h-5 text-indigo-400"/>Columns for <span className="text-indigo-300">{result.name}</span></h3>
                                <ul className="space-y-2 max-h-[55vh] overflow-y-auto pr-2">
                                    {result.columns.map((col, i) => (
                                        <li key={col.name} className="flex items-center text-slate-300 animate-fade-in-up" style={{ animationDelay: `${i * 75}ms` }}>
                                            <ChevronsRight className="w-4 h-4 mr-2 text-indigo-500" />{col.name}<span className="ml-auto text-indigo-400/80 font-mono text-xs">{col.type}</span>
                                        </li>
                                    ))}
                                </ul>
                            </GlassPanel>
                            <div className="lg:col-span-2 space-y-6">
                                <GlassPanel>
                                     <h3 className="font-semibold text-white mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-400" /> AI Summary</h3>
                                     <p className="text-slate-300 text-sm leading-relaxed">{result.description}</p>
                                </GlassPanel>
                                <GlassPanel>
                                    <h3 className="font-semibold text-white mb-6">AI Generated Lineage</h3>
                                    <div className="flex items-center justify-around text-center text-sm">
                                        <LineageNode icon={Server} label={result.lineage.upstream[0]} delay="300ms" />
                                        <svg className="w-24 h-20"><path d="M5 50 L95 50" stroke="#4f46e5" strokeWidth="1.5" className="line-draw-path" style={{animationDelay: '500ms'}}/></svg>
                                        <LineageNode icon={Table} label={result.name} delay="200ms" />
                                        <svg className="w-24 h-20"><path d="M5 50 L95 50" stroke="#4f46e5" strokeWidth="1.5" className="line-draw-path" style={{animationDelay: '700ms'}}/></svg>
                                        <LineageNode icon={Eye} label={result.lineage.downstream[0]} delay="400ms" />
                                    </div>
                                </GlassPanel>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default MetadataSearchPage;