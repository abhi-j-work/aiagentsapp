import React, { useState, useEffect } from 'react';
import { LoaderCircle, AlertTriangle, BrainCircuit, ArrowLeft } from 'lucide-react';
import { postGenerateKnowledgeGraphHtml } from '../services/api'; // <-- Import the new function

const KnowledgeGraphPage = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [kgHtmlContent, setKgHtmlContent] = useState<string | null>(null);

    useEffect(() => {
        // This function runs once when the page loads to fetch the graph
        const fetchGraph = async () => {
            try {
                // Read the connection string from the URL query parameter
                const params = new URLSearchParams(window.location.search);
                const connStr = params.get('connStr');

                if (!connStr) {
                    throw new Error("No database connection string was provided. Please return to the previous page and connect first.");
                }

                // The connection string is URL-encoded, so we decode it
                const decodedConnStr = decodeURIComponent(connStr);
                
                // --- SINGLE, EFFICIENT API CALL ---
                const htmlContent = await postGenerateKnowledgeGraphHtml(decodedConnStr);
                setKgHtmlContent(htmlContent);

            } catch (err: any) {
                setError(err.message || 'An unknown error occurred while building the graph.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchGraph();
    }, []); // The empty dependency array [] ensures this runs only once on mount

    return (
        <div className="h-screen w-full bg-slate-900 text-white flex flex-col p-4 lg:p-6 gap-4">
            <header className="flex-shrink-0 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BrainCircuit className="w-8 h-8 text-indigo-400"/>
                    Semantic Knowledge Graph Brain
                </h1>
                <a 
                    href="/data-lineage" // This link goes back to the main Lineage page
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition flex items-center justify-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Lineage
                </a>
            </header>
            
            <main className="flex-grow card-border rounded-xl bg-slate-800/30 flex items-center justify-center p-2 relative overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center gap-4 text-slate-400">
                        <LoaderCircle className="w-10 h-10 animate-spin text-indigo-400" />
                        <span>Analyzing Data Estate & Building Graph...</span>
                    </div>
                ) : error ? (
                     <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-md">
                        <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold">Failed to Generate Graph</h3>
                            <p>{error}</p>
                        </div>
                    </div>
                ) : kgHtmlContent ? (
                    <iframe
                        srcDoc={kgHtmlContent}
                        title="Semantic Knowledge Graph"
                        className="w-full h-full border-0 rounded-lg"
                        sandbox="allow-scripts allow-same-origin" // Security best practice
                    />
                ) : null}
            </main>
        </div>
    );
};

export default KnowledgeGraphPage;