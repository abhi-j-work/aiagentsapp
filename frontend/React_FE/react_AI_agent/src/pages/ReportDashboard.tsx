import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, Sparkles } from 'lucide-react';

import type { ExecuteQualityChecksResponse } from '../services/api';

interface ReportDashboardProps {
    report: ExecuteQualityChecksResponse;
}

const COLORS = {
    PASS: '#22c55e', // green-500
    FAIL: '#ef4444', // red-500
    GRID: '#475569', // slate-600
    TEXT: '#cbd5e1', // slate-300
};

const ReportDashboard: React.FC<ReportDashboardProps> = ({ report }) => {
    // 1. Prepare data for the charts
    const chartData = useMemo(() => {
        const passedCount = report.validation_results.filter(r => r.is_valid).length;
        const failedCount = report.validation_results.length - passedCount;
        const totalIssues = report.validation_results.reduce((acc, r) => acc + r.invalid_count, 0);
        const qualityScore = report.validation_results.length > 0 ? Math.round((passedCount / report.validation_results.length) * 100) : 100;

        const pieData = [
            { name: 'Passed Checks', value: passedCount },
            { name: 'Failed Checks', value: failedCount },
        ];

        const barData = report.validation_results
            .filter(r => !r.is_valid && r.invalid_count > 0)
            .map(r => ({
                name: r.rule_name,
                errors: r.invalid_count,
            }))
            .sort((a, b) => b.errors - a.errors); // Sort by most errors

        return { passedCount, failedCount, totalIssues, qualityScore, pieData, barData };
    }, [report]);

    return (
        <div className="w-full bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/20 p-6 md:p-8 animate-fade-in">
            {/* --- Header --- */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                    Data Quality Report: <span className="text-amber-300">{report.table_name}</span>
                </h3>
                <p className="text-slate-400 mt-1">Analysis complete. Here are the results.</p>
            </div>

            {/* --- KPIs & Pie Chart Grid --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* KPIs */}
                <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
                    <div className="flex flex-col items-center justify-center text-center"><p className="text-4xl font-bold text-amber-400">{chartData.qualityScore}<span className="text-2xl">%</span></p><p className="text-sm text-slate-300 mt-2">Quality Score</p></div>
                    <div className="flex flex-col items-center justify-center text-center"><p className="text-4xl font-bold text-green-400">{chartData.passedCount}</p><p className="text-sm text-slate-300 mt-2">Checks Passed</p></div>
                    <div className="flex flex-col items-center justify-center text-center"><p className="text-4xl font-bold text-red-400">{chartData.failedCount}</p><p className="text-sm text-slate-300 mt-2">Checks Failed</p></div>
                    <div className="flex flex-col items-center justify-center text-center"><p className="text-4xl font-bold text-slate-100">{chartData.totalIssues.toLocaleString()}</p><p className="text-sm text-slate-300 mt-2">Total Issues Found</p></div>
                </div>

                {/* Pie Chart */}
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
                     <h4 className="text-center font-semibold text-white mb-4">Checks Overview</h4>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={chartData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                <Cell key="pass" fill={COLORS.PASS} />
                                <Cell key="fail" fill={COLORS.FAIL} />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* --- Bar Chart for Errors --- */}
            {chartData.barData.length > 0 && (
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 mb-8">
                    <h4 className="font-semibold text-white mb-4">Error Breakdown by Rule</h4>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData.barData} margin={{ top: 5, right: 20, left: -10, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.GRID} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: COLORS.TEXT, fontSize: 12 }} />
                            <YAxis tick={{ fill: COLORS.TEXT, fontSize: 12 }} />
                            <Tooltip cursor={{fill: 'rgba(148, 163, 184, 0.1)'}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                            <Legend />
                            <Bar dataKey="errors" fill={COLORS.FAIL} name="Invalid Rows" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* --- Detailed Results Table --- */}
            <div>
                 <h4 className="font-semibold text-white mb-4">Detailed Check Results</h4>
                 <div className="overflow-x-auto bg-slate-900/50 rounded-lg border border-slate-800">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                            <tr>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Rule Name</th>
                                <th scope="col" className="px-6 py-3 text-right">Issues Found</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.validation_results.map(result => (
                                <tr key={result.check_id} className={`border-b border-slate-800 ${result.is_valid ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    <td className="px-6 py-4">
                                        {result.is_valid ? 
                                            <span className="flex items-center gap-2 text-green-400"><CheckCircle className="w-5 h-5" /> PASS</span> :
                                            <span className="flex items-center gap-2 text-red-400"><XCircle className="w-5 h-5" /> FAIL</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-100">{result.rule_name}</td>
                                    <td className="px-6 py-4 text-right font-mono">{result.invalid_count.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default ReportDashboard;