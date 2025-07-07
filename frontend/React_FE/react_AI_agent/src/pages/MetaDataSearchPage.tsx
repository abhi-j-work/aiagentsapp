import { useState } from 'react';
import { LoaderCircle, ScanSearch, Server, Table, ChevronsRight, Share2, Eye } from 'lucide-react';

// Mock data, replace with API call
const MOCK_SCHEMA = {
  name: "customer_sales",
  description: "This table is the source of truth for all customer transactions. It contains sensitive PII and financial data, and is governed by the 'Sales Data' policy.",
  columns: [
    { name: 'sale_id', type: 'UUID' }, { name: 'customer_email', type: 'VARCHAR' }, { name: 'product_sku', type: 'VARCHAR' },
    { name: 'sale_amount', type: 'DECIMAL' }, { name: 'transaction_date', type: 'TIMESTAMP' },
  ],
  lineage: { upstream: ['stg_orders', 'dim_customers'], downstream: ['rpt_quarterly_sales', 'agg_customer_ltv'] }
};

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
        <div className="animate-fade-in-slide-up">
            <h1 className="text-3xl font-bold mb-2">Metadata Schema Search</h1>
            <p className="text-slate-400 mb-8">Discover and understand your data assets in the Iceberg catalog.</p>

            <form onSubmit={handleSearch} className="max-w-xl mb-10 relative">
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a table by name..."
                    className="w-full pl-4 pr-28 py-3 glass rounded-lg border-2 border-slate-700 text-white focus:border-indigo-500 focus:outline-none transition" />
                <button type="submit" disabled={isLoading} className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-500 transition disabled:bg-slate-700 ${!isLoading && searchQuery && 'animate-scan-pulse'}`}>
                    {isLoading ? <LoaderCircle className="w-5 h-5 animate-spin" /> : 'Search'}
                </button>
            </form>

            {isLoading && (
                <div className="flex flex-col items-center text-slate-400 mt-20">
                    <ScanSearch className="w-16 h-16 mb-4 animate-pulse text-indigo-500"/>
                    <p>AI Agent is scanning the catalog...</p>
                </div>
            )}

            {result && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-slide-up">
                    <div className="lg:col-span-1 bg-slate-900/50 p-6 rounded-lg">
                        <h3 className="font-semibold text-white flex items-center gap-2 mb-4"><Table className="w-5 h-5 text-indigo-400"/>Columns for <span className="text-indigo-300">{result.name}</span></h3>
                        <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 cascade-in">
                            {result.columns.map((col, i) => (
                                <li key={col.name} style={{ animationDelay: `${i*50}ms` }} className="flex items-center text-slate-300">
                                    <ChevronsRight className="w-4 h-4 mr-2 text-indigo-500" />{col.name}<span className="ml-auto text-indigo-400/80 font-mono text-xs">{col.type}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="lg:col-span-2 bg-slate-900/50 p-6 rounded-lg space-y-8">
                        <div>
                             <h3 className="font-semibold text-white mb-2">AI Summary</h3>
                             <p className="text-slate-300 text-sm leading-relaxed">{result.description}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold text-white mb-4">AI Generated Lineage</h3>
                             <div className="flex items-center justify-around text-center text-sm">
                                <div className="space-y-2 cascade-in"><h4 className="font-semibold text-slate-400">Upstream</h4>{result.lineage.upstream.map((up, i) => <div key={up} style={{animationDelay: `${i*100}ms`}} className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-md"><Server className="w-4 h-4 text-slate-500"/>{up}</div>)}</div>
                                <svg className="w-24 h-20"><path d="M5 50 L95 50" stroke="#4f46e5" strokeWidth="2" className="line-draw-path"/></svg>
                                <div className="bg-indigo-600 p-3 rounded-lg shadow-lg"><p className="font-bold text-white">{result.name}</p></div>
                                <svg className="w-24 h-20"><path d="M5 50 L95 50" stroke="#4f46e5" strokeWidth="2" className="line-draw-path" style={{animationDelay: '0.5s'}}/></svg>
                                <div className="space-y-2 cascade-in"><h4 className="font-semibold text-slate-400">Downstream</h4>{result.lineage.downstream.map((down, i) => <div key={down} style={{animationDelay: `${i*100}ms`}} className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-md"><Eye className="w-4 h-4 text-slate-500"/>{down}</div>)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MetadataSearchPage;