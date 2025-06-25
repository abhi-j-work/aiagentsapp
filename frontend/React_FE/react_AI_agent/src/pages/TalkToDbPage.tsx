import React, { useState } from 'react';
import { 
    LoaderCircle, 
    AlertTriangle, 
    Send, 
    FileCode, 
    Table, 
    Database, 
    MessageSquareQuote, 
    Edit3,
    CheckCircle // Added for the "Set Connection" button
} from 'lucide-react';
import { postTalkToDbQuery, type TalkToDbResponse } from '../services/api';

// ===================================================
// SUB-COMPONENTS for displaying results (No Changes)
// ===================================================

const SqlDisplay = ({ sql }: { sql: string }) => (
    <div className="animate-fade-in">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><FileCode className="w-4 h-4 text-indigo-400" />AI Generated SQL</h4>
        <div className="max-h-64 overflow-y-auto bg-black p-4 rounded-md border border-slate-700">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap"><code>{sql}</code></pre>
        </div>
    </div>
);

const DataTable = ({ data, message }: { data?: Record<string, any>[], message?: string }) => {
    if (message) {
        return <div className="text-center text-green-300 p-4 bg-green-900/50 rounded-lg animate-fade-in">{message}</div>;
    }
    if (!data || data.length === 0) {
        return <div className="text-center text-slate-400 p-4 animate-fade-in">Query returned no data.</div>;
    }
    const headers = Object.keys(data[0]);

    return (
        <div className="animate-fade-in">
            <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><Table className="w-4 h-4 text-indigo-400" />Query Results</h4>
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-800 sticky top-0 z-10">
                        <tr>
                            {headers.map(header => <th key={header} className="p-2 font-medium text-slate-300">{header}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.map((row, rowIndex) => (
                            <tr key={rowIndex} className="bg-slate-900/70 hover:bg-slate-800">
                                {headers.map(header => <td key={`${rowIndex}-${header}`} className="p-2 text-slate-400 whitespace-nowrap">{String(row[header])}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ===================================================
// MAIN PAGE COMPONENT
// ===================================================
const TalkToDbPage = () => {
    // UI State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConnectionSet, setIsConnectionSet] = useState(false);
    
    // Form Input State
    const [connectionString, setConnectionString] = useState('');
    const [prompt, setPrompt] = useState('');
    
    // Result State
    const [result, setResult] = useState<TalkToDbResponse | null>(null);

    // Handler for the "Set Connection" button
    const handleSetConnection = (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectionString.trim()) {
            setError("Connection string cannot be empty.");
            return;
        }
        setIsConnectionSet(true);
        setError(null); // Clear previous errors
    };

    // Handler for submitting the prompt to the AI
    const handleSubmitPrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            setError("Please enter a question.");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setResult(null);
        
        try {
            const response = await postTalkToDbQuery({ connection_string: connectionString, prompt });
            setResult(response);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handler to show the connection string input again
    const handleEditConnection = () => {
        setIsConnectionSet(false);
        setResult(null); // Clear old results when changing connection
    };

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="relative card-border overflow-hidden rounded-2xl flex flex-col animate-vertical-float">
                    
                    <div className="p-6 border-b border-indigo-500/20 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                                <MessageSquareQuote className="w-6 h-6 text-indigo-400" />
                                Talk to Your Database
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {isConnectionSet ? "Step 2: Ask a question." : "Step 1: Connect to your database."}
                            </p>
                        </div>
                        {isConnectionSet && (
                            <button 
                                onClick={handleEditConnection}
                                disabled={isLoading}
                                className="flex items-center gap-2 text-xs px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                            >
                                <Edit3 className="w-3 h-3" />
                                Change Connection
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {/* --- VIEW 1: Set Connection --- */}
                        {!isConnectionSet && (
                            <form onSubmit={handleSetConnection} className="space-y-4 animate-fade-in">
                                <div>
                                    <label htmlFor="connStr" className="text-sm font-medium text-slate-300 block mb-2 flex items-center gap-2">
                                        <Database className="w-4 h-4"/> Database Connection String
                                    </label>
                                    <input 
                                        id="connStr" 
                                        type="password" 
                                        value={connectionString} 
                                        onChange={(e) => setConnectionString(e.target.value)} 
                                        placeholder="postgresql://user:password@host/database"
                                        className="w-full px-4 py-2 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition" 
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={!connectionString}
                                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-500 transition disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5"/>
                                    Set Connection
                                </button>
                            </form>
                        )}

                        {/* --- VIEW 2: Ask Question --- */}
                        {isConnectionSet && (
                             <form onSubmit={handleSubmitPrompt} className="space-y-4 animate-fade-in">
                                <div>
                                    <label htmlFor="prompt" className="text-sm font-medium text-slate-300 block mb-2">
                                        Your Question
                                    </label>
                                    <textarea 
                                        id="prompt" 
                                        value={prompt} 
                                        onChange={(e) => setPrompt(e.target.value)} 
                                        placeholder="e.g., Show me the total sales for each product category"
                                        rows={3}
                                        className="w-full px-4 py-2 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition" 
                                        disabled={isLoading}
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isLoading || !prompt}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                    {isLoading ? <LoaderCircle className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                                    {isLoading ? 'Querying...' : 'Ask AI'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* --- Results Area --- */}
                    <div className="p-6 pt-0">
                        {isLoading && (
                            <div className="text-center p-4 text-slate-400 animate-pulse">
                                <LoaderCircle className="w-6 h-6 mx-auto animate-spin" />
                                <p className="mt-2 text-sm">AI is thinking...</p>
                            </div>
                        )}
                        {error && (
                            <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        {result && (
                            <div className="space-y-6">
                                <SqlDisplay sql={result.generated_sql} />
                                <DataTable data={result.data} message={result.message} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TalkToDbPage;