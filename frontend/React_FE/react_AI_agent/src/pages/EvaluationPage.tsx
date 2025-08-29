// File: src/pages/EvaluationPage.tsx

import React, { useState } from 'react';
import { LoaderCircle, AlertTriangle, Play, CheckCircle, XCircle, FileText } from 'lucide-react';
import { postRunAllEvaluations, type FullEvaluationReport, type AgentEvaluationSummary, type TalkToDbDetailedResult, type AgentTaskDetailedResult } from '../services/api';

// --- Style Constants ---
const cardContainerStyle = "card-border rounded-2xl bg-slate-900/70 backdrop-blur-sm animate-fade-in";
const cardHeaderStyle = "p-6 border-b border-indigo-500/30";
const cardTitleStyle = "text-xl font-semibold text-white flex items-center gap-3";

// --- Sub-Components ---

const SummaryCard: React.FC<{ summary: AgentEvaluationSummary }> = ({ summary }) => {
    const getScoreColor = (score: number) => {
        if (score >= 4.0) return 'text-green-400';
        if (score >= 2.5) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex justify-between items-center">
            <div>
                <p className="font-semibold text-white">{summary.agent}</p>
                <p className="text-xs text-slate-400">{summary.total_prompts} tests</p>
            </div>
            {summary.status === 'Completed' ? (
                <p className={`font-bold text-2xl ${getScoreColor(summary.average_score)}`}>
                    {summary.average_score.toFixed(2)}
                    <span className="text-sm text-slate-400"> / 5.0</span>
                </p>
            ) : (
                <p className="text-sm text-slate-500">{summary.status}</p>
            )}
        </div>
    );
};

// NEW: A reusable component to display detailed results for any agent
const DetailedResultsCard: React.FC<{ title: string; results: (TalkToDbDetailedResult | AgentTaskDetailedResult)[] }> = ({ title, results }) => {
    if (!results || results.length === 0) return null;

    const getRowColor = (status: string) => {
        if (status === 'SUCCESS') return 'hover:bg-slate-800';
        return 'bg-red-900/30 hover:bg-red-900/50';
    };

    // Check if the results are for Talk-to-DB to conditionally show the Golden SQL column
    const isTalkToDb = 'golden_sql' in results[0];

    return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
            <div className="max-h-96 overflow-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-800 sticky top-0 z-10">
                        <tr>
                            <th className="p-2 font-medium text-slate-300">Status</th>
                            <th className="p-2 font-medium text-slate-300">Score</th>
                            <th className="p-2 font-medium text-slate-300">Prompt</th>
                            {isTalkToDb && <th className="p-2 font-medium text-slate-300">Golden SQL</th>}
                            <th className="p-2 font-medium text-slate-300">Reasoning / Error</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {results.map((row, index) => (
                            <tr key={index} className={getRowColor(row.status)}>
                                <td className="p-2">
                                    {row.status === 'SUCCESS' ? 
                                        <CheckCircle className="w-4 h-4 text-green-500" /> : 
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    }
                                </td>
                                <td className="p-2 font-mono text-white">{row.score.toFixed(1)}</td>
                                <td className="p-2 text-slate-300 max-w-xs truncate" title={row.prompt}>{row.prompt}</td>
                                {isTalkToDb && (
                                    <td className="p-2 text-slate-400 max-w-xs truncate" title={(row as TalkToDbDetailedResult).golden_sql}>{(row as TalkToDbDetailedResult).golden_sql}</td>
                                )}
                                <td className="p-2 text-slate-400 max-w-xs truncate" title={row.reasoning}>{row.reasoning}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


// --- Main Page Component ---
const EvaluationPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<FullEvaluationReport | null>(null);

    const handleRunEvaluation = async () => {
        setIsLoading(true);
        setError(null);
        setReport(null);
        try {
            const response = await postRunAllEvaluations();
            setReport(response);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during evaluation.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <div className={cardContainerStyle}>
                    <div className={cardHeaderStyle}>
                        <h2 className={cardTitleStyle}>
                            <FileText className="w-6 h-6 text-indigo-400" />
                            AI Agent Evaluation Dashboard
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="text-center">
                            <p className="text-slate-400 mb-4">
                                Run a comprehensive benchmark test against the Golden Datasets to measure agent performance.
                            </p>
                            <button
                                onClick={handleRunEvaluation}
                                disabled={isLoading}
                                className="group bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center justify-center mx-auto font-semibold px-5 py-2.5 rounded-lg shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <LoaderCircle className="animate-spin w-5 h-5 mr-3" />
                                        <span>Running Benchmarks...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:translate-x-1" />
                                        <span>Start Full Evaluation</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="mt-6 flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        {report && (
                            <div className="mt-8 animate-fade-in">
                                <h3 className="text-lg font-semibold text-white mb-4">Overall Summary</h3>
                                <div className="space-y-3">
                                    {report.summary_report.map(summary => (
                                        <SummaryCard key={summary.agent} summary={summary} />
                                    ))}
                                </div>
                                {/* UPDATED: Render detailed results for all agents that have data */}
                                {report.detailed_results.talk_to_db?.length > 0 && (
                                    <DetailedResultsCard title="Detailed Results: Talk-to-DB" results={report.detailed_results.talk_to_db} />
                                )}
                                {report.detailed_results.data_quality?.length > 0 && (
                                    <DetailedResultsCard title="Detailed Results: Data Quality" results={report.detailed_results.data_quality} />
                                )}
                                {report.detailed_results.data_governance?.length > 0 && (
                                    <DetailedResultsCard title="Detailed Results: Data Governance" results={report.detailed_results.data_governance} />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationPage;