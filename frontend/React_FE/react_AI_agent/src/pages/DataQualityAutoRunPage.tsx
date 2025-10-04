import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    LoaderCircle, AlertTriangle, CheckCircle, Download, Eye, Table, UserCircle, BarChart3
} from 'lucide-react';
import {
    postGenerateDataProfile,
    postGenerateQualityPlan,
    postExecuteQualityChecks,
    postGenerateRemediationSql,
    postApplyRemediationPlan,
    postListFilteredViews,
    postFetchFilteredViewData,
    type ExecuteQualityChecksResponse,
    type GenerateRemediationResponse,
    type ListFilteredViewsResponse,
    type FetchViewDataResponse,
    type GenerateQualityPlanResponse,
} from '../services/api';

// ===================================================
// Helper Function for Downloading Report
// ===================================================
const downloadQualityReport = (reportData: ExecuteQualityChecksResponse) => {
    if (!reportData) return;
    const reportJson = JSON.stringify(reportData, null, 2);
    const blob = new Blob([reportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `quality-report-${reportData.table_name}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

// ===================================================
// Reusable Sub-components
// ===================================================
const AutoRunSummaryChart = ({ report }: { report: ExecuteQualityChecksResponse | null }) => {
    const chartData = useMemo(() => {
        if (!report) return { passed: 0, failed: 0 };
        const passed = report.validation_results.filter(r => r.is_valid).length;
        const failed = report.validation_results.length - passed;
        return { passed, failed };
    }, [report]);

    if (!report) return null;

    const data = [
        { name: 'Passed', value: chartData.passed },
        { name: 'Failed', value: chartData.failed },
    ];
    
    const COLORS = ['#4ade80', '#f87171'];

    return (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-white text-center flex items-center justify-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Quality Check Summary
            </h4>
            <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(30, 41, 59, 0.8)',
                                borderColor: '#4f46e5',
                                borderRadius: '0.5rem',
                            }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const QualityViewList = ({ views, onSelectView, isLoading, selectedView }: { views: string[], onSelectView: (viewName: string) => void, isLoading: boolean, selectedView: string | null }) => (
    <div className="animate-fade-in mt-4">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-indigo-400" />Data Quality Views</h4>
        <div className="space-y-2 bg-slate-800/60 rounded-md p-3">{views.map(viewName => (
            <button key={viewName} onClick={() => onSelectView(viewName)} disabled={isLoading} className={`w-full text-left text-sm p-2 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 ${selectedView === viewName ? 'bg-indigo-600 text-white' : 'bg-slate-900/70 text-slate-300 hover:bg-slate-700'}`}>
                {isLoading && selectedView === viewName ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4 text-slate-400" />} {viewName}
            </button>
        ))}</div>
    </div>
);

const ViewDataDisplay = ({ viewData }: { viewData: FetchViewDataResponse }) => {
    if (!viewData.data || viewData.data.length === 0) return <div className="text-center text-slate-300 p-4 mt-4 animate-fade-in">No data to display for this view.</div>;
    const headers = Object.keys(viewData.data[0]);
    return (
        <div className="animate-fade-in mt-4">
            <h5 className="font-semibold text-white mb-3">Data from: <span className="text-indigo-400">{viewData.view_name}</span></h5>
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-700"><table className="w-full text-sm text-left">
                <thead className="bg-slate-800 sticky top-0 z-10"><tr>{headers.map(h => <th key={h} className="p-3 font-medium text-slate-200">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-800">{viewData.data.map((row, i) => (<tr key={i} className="bg-slate-900/70 hover:bg-slate-800">{headers.map(h => <td key={`${i}-${h}`} className="p-3 text-slate-300 whitespace-nowrap">{String(row[h])}</td>)}</tr>))}</tbody>
            </table></div>
        </div>
    );
};

// ===================================================
// MAIN PAGE COMPONENT
// ===================================================
const DataQualityAutoRunPage = () => {
    const location = useLocation();
    const { connectionString, tableName, model } = location.state || { connectionString: '', tableName: '', model: '' };

    const [isLoading, setIsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState('Starting...');
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [reportData, setReportData] = useState<ExecuteQualityChecksResponse | null>(null);

    const [isFetchingViews, setIsFetchingViews] = useState(false);
    const [qualityViews, setQualityViews] = useState<string[] | null>(null);
    const [selectedView, setSelectedView] = useState<string | null>(null);
    const [viewData, setViewData] = useState<FetchViewDataResponse | null>(null);
    const [viewingRole, setViewingRole] = useState<string>('public');

    useEffect(() => {
        if (!tableName) {
            setError("Table name is missing. Please return to the previous page and select a table.");
            setIsLoading(false);
            return;
        }

        const runAllSteps = async () => {
            try {
                // Step 1: Generate Data Profile
                setCurrentStep('Step 1/5: Generating data profile...');
                await postGenerateDataProfile(connectionString, tableName);

                // Step 2: Generate Quality Plan
                setCurrentStep('Step 2/5: Generating AI quality plan...');
                const plan: GenerateQualityPlanResponse = await postGenerateQualityPlan(connectionString, tableName, '');
                if (!plan.proposed_checks || plan.proposed_checks.length === 0) {
                    throw new Error("The AI did not propose any quality checks to run.");
                }

                // Step 3: Execute Quality Checks
                setCurrentStep('Step 3/5: Executing quality checks...');
                const qualityResults: ExecuteQualityChecksResponse = await postExecuteQualityChecks(
                    connectionString,
                    tableName,
                    plan.proposed_checks
                );
                setReportData(qualityResults);

                const failedChecks = qualityResults.validation_results
                    .filter(result => !result.is_valid)
                    .map(result => result.check);

                if (failedChecks.length > 0) {
                    // Step 4: Generate Remediation Plan
                    setCurrentStep('Step 4/5: Generating remediation plan for failed checks...');
                    const remediationPlan: GenerateRemediationResponse = await postGenerateRemediationSql(
                        connectionString,
                        failedChecks
                    );

                    if (!remediationPlan.remediation_plan || remediationPlan.remediation_plan.length === 0) {
                        throw new Error(
                            "Quality checks failed, but no remediation plan was generated. This may indicate a server-side issue."
                        );
                    }

                    // Step 5: Apply Remediation
                    setCurrentStep('Step 5/5: Applying remediation and creating views...');
                    await postApplyRemediationPlan(connectionString, remediationPlan);
                } else {
                    setCurrentStep('Step 4/5: All quality checks passed. No remediation needed.');
                }

                // Final Step: List the resulting filtered views
                setCurrentStep('Final Step: Fetching resulting views...');
                const viewsResponse: ListFilteredViewsResponse = await postListFilteredViews(connectionString);
                setQualityViews(viewsResponse.filtered_views);

                setCurrentStep('All steps completed successfully!');
                setIsComplete(true);
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred during the automated run.');
            } finally {
                setIsLoading(false);
            }
        };

        runAllSteps();
    }, [connectionString, tableName, model]);

    const handleFetchViewData = async (viewName: string) => {
        if (!viewingRole) { setError("Please specify a role to view data as."); return; }
        setIsFetchingViews(true);
        setSelectedView(viewName);
        setViewData(null);
        try {
            const res = await postFetchFilteredViewData({
                connection_string: connectionString,
                view_name: viewName,
                role: viewingRole,
                limit: 50,
            });
            setViewData(res);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch view data.');
        } finally {
            setIsFetchingViews(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-8">
            <div className="w-full max-w-4xl mx-auto">
                <div className="card-border rounded-2xl p-8">
                    <h2 className="text-2xl font-semibold text-white text-center mb-6">Automated Data Quality Run</h2>

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <LoaderCircle className="w-12 h-12 text-indigo-400 animate-spin" />
                            <p className="text-slate-300 text-lg font-medium">{currentStep}</p>
                        </div>
                    )}

                    {error && !isComplete && (
                        <div className="flex flex-col items-center text-center gap-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 animate-fade-in">
                            <AlertTriangle className="w-10 h-10" /><p className="font-semibold text-lg">An Error Occurred</p>
                            <p className="text-sm">{error}</p>
                            <Link to="/data-quality" className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition">Go Back</Link>
                        </div>
                    )}

                    {isComplete && (
                        <div className="text-center animate-fade-in">
                            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-white">Process Complete!</h3>
                            <p className="text-slate-300 mt-2 mb-8">The automated data quality process has finished. Review the summary and download the full report.</p>

                            {reportData && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-8">
                                    <AutoRunSummaryChart report={reportData} />
                                    <div className="flex flex-col items-center justify-center p-4">
                                        <p className="text-slate-200 mb-4">Download the detailed JSON report for your records.</p>
                                        <button 
                                            onClick={() => downloadQualityReport(reportData)} 
                                            className="group bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center text-sm font-semibold px-6 py-3 rounded-lg shadow-lg w-full max-w-xs justify-center"
                                        >
                                            <Download className="w-4 h-4 mr-2" /> Download Full Report
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-8 border-t border-slate-700 text-left">
                                {error && <div className="flex items-center gap-3 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><span>{error}</span></div>}

                                {qualityViews && qualityViews.length > 0 ? (
                                    <>
                                        <div className="relative mb-4">
                                            <label htmlFor="roleInput" className="block text-sm font-medium text-slate-300 mb-2">View Data as Role:</label>
                                            <UserCircle className="w-5 h-5 absolute left-3 top-10 -translate-y-1/2 text-slate-400" />
                                            <input id="roleInput" type="text" value={viewingRole} onChange={(e) => setViewingRole(e.target.value)} placeholder="e.g., public, analyst" className="w-full pl-10 pr-4 py-2 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition" disabled={isFetchingViews} />
                                        </div>
                                        <QualityViewList views={qualityViews} onSelectView={handleFetchViewData} isLoading={isFetchingViews} selectedView={selectedView} />
                                    </>
                                ) : (<p className="text-center text-slate-400">No new quality views were generated. Your data appears to be clean!</p>)}

                                {viewData && <ViewDataDisplay viewData={viewData} />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataQualityAutoRunPage;
