import React, { useState, useMemo } from 'react';
import {
    LoaderCircle, AlertTriangle, PlayCircle, Database, Sparkles, ShieldCheck, CheckCircle,
    XCircle, ChevronLeft, RefreshCw, ClipboardList, BarChart3, Fingerprint, Ban, PenTool,
    KeyRound, HelpCircle, Sigma, Target, Eye, EyeOff
} from 'lucide-react';

import {
    postGenerateDataProfile,
    postGenerateQualityPlan,
    postExecuteQualityChecks,
} from '../services/api';

import type {
    GenerateDataProfileResponse,
    GenerateQualityPlanResponse,
    ExecuteQualityChecksResponse,
    ProposedQualityCheck,
    ColumnProfile
} from '../services/api';
import ReportDashboard from './ReportDashboard';

// --- Prop Types for Sub-Components ---
interface CheckItemProps {
    check: ProposedQualityCheck;
    isChecked: boolean;
    onCheckChange: (id: string, isChecked: boolean) => void;
}

interface DataProfileSidebarProps {
    profile: GenerateDataProfileResponse | null;
}

interface ReportSummaryProps {
    report: ExecuteQualityChecksResponse;
}

interface StepIndicatorProps {
    currentStep: number;
}


// --- Sub-Components ---
const CheckItem: React.FC<CheckItemProps> = ({ check, isChecked, onCheckChange }) => {
    const getIcon = () => {
        const name = check.rule_name.toLowerCase();
        if (name.includes('unique') || name.includes('uniqueness')) return <Fingerprint className="w-5 h-5 text-indigo-400" />;
        if (name.includes('null') || name.includes('missing')) return <Ban className="w-5 h-5 text-rose-400" />;
        if (name.includes('format') || name.includes('regex') || name.includes('pattern')) return <PenTool className="w-5 h-5 text-sky-400" />;
        if (name.includes('primary key')) return <KeyRound className="w-5 h-5 text-amber-400" />;
        return <HelpCircle className="w-5 h-5 text-slate-500" />;
    };

    return (
        <label className="flex items-start p-3 bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-700/80 border border-slate-700/50 hover:border-amber-500/50 transition-all">
            <div className="flex-shrink-0 mt-0.5 mr-4">{getIcon()}</div>
            <div className="flex-grow">
                <p className="font-medium text-slate-100">{check.rule_name}</p>
                <p className="text-slate-400 mt-1 text-sm">{check.rule_description}</p>
            </div>
            <input type="checkbox" className="ml-4 mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900" checked={isChecked} onChange={(e) => onCheckChange(check.check_id, e.target.checked)} />
        </label>
    );
};

const DataProfileSidebar: React.FC<DataProfileSidebarProps> = ({ profile }) => {
    // ==========================================================
    // FIXED LINE: Added a check for `!profile.column_profiles`
    // ==========================================================
    if (!profile || !profile.column_profiles || profile.column_profiles.length === 0) {
        return (
             <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
                 <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/80">
                     <h5 className="font-semibold text-white flex items-center gap-2 mb-2"><BarChart3 className="w-5 h-5 text-sky-400" />Data Profile</h5>
                     <p className="text-sm text-slate-400">Profile data will appear here after analysis.</p>
                </div>
            </div>
        );
    }
    
    const totalRows = profile.column_profiles[0]?.total_values ?? 0;

    const formatStat = (value: number | null | undefined) => {
        if (value === null || typeof value === 'undefined') return 'N/A';
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    return (
        <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
             <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/80">
                <h5 className="font-semibold text-white flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                    <BarChart3 className="w-5 h-5 text-sky-400" />
                    Data Profile: <span className="text-amber-300">{profile.table_name}</span>
                </h5>
                <ul className="text-sm space-y-2 pt-2">
                    <li className="flex justify-between items-center text-slate-300"><span><Sigma className="inline w-4 h-4 mr-2"/>Total Rows</span> <span className="font-mono text-sky-300">{totalRows.toLocaleString()}</span></li>
                    <li className="flex justify-between items-center text-slate-300"><span><Database className="inline w-4 h-4 mr-2"/>Columns</span> <span className="font-mono text-sky-300">{profile.column_profiles.length}</span></li>
                </ul>

                <div className="mt-4 max-h-[20rem] overflow-y-auto space-y-2 pr-2">
                    {profile.column_profiles.map((col: ColumnProfile) => (
                        <details key={col.column_name} className="bg-slate-800/50 rounded-md transition-colors hover:bg-slate-800/80">
                             <summary className="p-2 cursor-pointer font-medium text-slate-200 text-sm list-none flex items-center justify-between">
                                {col.column_name}
                                <span className="text-xs font-mono text-sky-300 bg-sky-900/50 px-2 py-0.5 rounded-md">{col.data_type}</span>
                            </summary>
                            <div className="p-3 border-t border-slate-700 text-xs text-slate-400 grid grid-cols-2 gap-x-4 gap-y-1">
                                <span className="font-semibold">Nulls:</span><span>{col.null_count} ({(col.null_percentage * 100).toFixed(1)}%)</span>
                                <span className="font-semibold">Distinct:</span><span>{col.distinct_count} ({(col.distinct_percentage * 100).toFixed(1)}%)</span>
                                {typeof col.min_value === 'number' && <><span>Min:</span><span>{formatStat(col.min_value)}</span></>}
                                {typeof col.max_value === 'number' && <><span>Max:</span><span>{formatStat(col.max_value)}</span></>}
                                {typeof col.avg_value === 'number' && <><span>Avg:</span><span>{formatStat(col.avg_value)}</span></>}
                                {typeof col.min_length === 'number' && <><span>Min Len:</span><span>{formatStat(col.min_length)}</span></>}
                                {typeof col.max_length === 'number' && <><span>Max Len:</span><span>{formatStat(col.max_length)}</span></>}
                                {col.earliest_date && <><span>Earliest:</span><span>{col.earliest_date}</span></>}
                                {col.latest_date && <><span>Latest:</span><span>{col.latest_date}</span></>}
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </div>
    );
};


const ReportSummary: React.FC<ReportSummaryProps> = ({ report }) => {
    const passedCount = report.validation_results.filter(r => r.is_valid).length;
    const totalCount = report.validation_results.length;
    const qualityScore = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 100;
    const totalIssues = report.validation_results.reduce((acc, r) => acc + r.invalid_count, 0);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 rounded-xl bg-slate-900/50 border border-slate-700/80">
             <div className="flex flex-col items-center justify-center p-2">
                <div className="relative w-24 h-24">
                    <svg className="w-full h-full" viewBox="0 0 36 36"><path className="text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5"></path><path className="text-amber-500" strokeDasharray={`${qualityScore}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"></path></svg>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-white">{qualityScore}<span className="text-sm">%</span></div>
                </div>
                <p className="mt-2 text-sm font-semibold text-amber-400">Quality Score</p>
            </div>
             <div className="flex flex-col items-center justify-center text-center"><p className="text-3xl font-bold text-green-400">{passedCount}</p><p className="text-sm text-slate-300 mt-1">Checks Passed</p></div>
             <div className="flex flex-col items-center justify-center text-center"><p className="text-3xl font-bold text-red-400">{totalCount - passedCount}</p><p className="text-sm text-slate-300 mt-1">Checks Failed</p></div>
             <div className="flex flex-col items-center justify-center text-center"><p className="text-3xl font-bold text-slate-100">{totalIssues.toLocaleString()}</p><p className="text-sm text-slate-300 mt-1">Total Issues Found</p></div>
        </div>
    );
};

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
    const steps = [
        { num: 1, name: "Define Scope", icon: <Target/> },
        { num: 2, name: "Review Plan", icon: <ClipboardList/> },
        { num: 3, name: "View Report", icon: <Sparkles/> }
    ];

    return (
        <nav className="flex items-center justify-center space-x-2 md:space-x-4 mb-10" aria-label="Progress">
            {steps.map((step, index) => (
                <React.Fragment key={step.name}>
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep >= step.num ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                           {React.cloneElement(step.icon, { className: 'w-6 h-6' })}
                        </div>
                        <p className={`mt-2 text-xs font-medium w-24 ${currentStep >= step.num ? 'text-amber-400' : 'text-slate-500'}`}>{step.name}</p>
                    </div>
                    {index < steps.length - 1 && <div className={`flex-1 h-0.5 transition-all duration-500 ${currentStep > step.num ? 'bg-amber-500' : 'bg-slate-700'}`}></div>}
                </React.Fragment>
            ))}
        </nav>
    );
};


// --- Main Page Component ---
const DataQualityAgentPage: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionString, setConnectionString] = useState<string>('');
    const [tableName, setTableName] = useState<string>('');
    const [dataProfile, setDataProfile] = useState<GenerateDataProfileResponse | null>(null);
    const [planResponse, setPlanResponse] = useState<GenerateQualityPlanResponse | null>(null);
    const [selectedChecks, setSelectedChecks] = useState<Set<string>>(new Set());
    const [validationReport, setValidationReport] = useState<ExecuteQualityChecksResponse | null>(null);
    const [showConnStr, setShowConnStr] = useState<boolean>(false);

    const proposedChecks = useMemo(() => planResponse?.proposed_checks || [], [planResponse]);

    const handleGeneratePlan = async () => {
        if (!tableName) { setError("Table name is required."); return; }
        setIsLoading(true); setError(null); setDataProfile(null); setPlanResponse(null);
        try {
            // Step 1: Generate the data profile
            const profileRes = await postGenerateDataProfile(connectionString, tableName);
            setDataProfile(profileRes);

            // Step 2: Generate the quality check plan
            const planRes = await postGenerateQualityPlan(connectionString, tableName);
            setPlanResponse(planRes);
            setSelectedChecks(new Set(planRes.proposed_checks.map(c => c.check_id)));
            setStep(2);
        } catch (err: any) { 
            setError(err.message || 'Failed to generate plan.'); 
        } finally { 
            setIsLoading(false); 
        }
    };
    
    const handleCheckChange = (id: string, isChecked: boolean) => {
        const newSet = new Set(selectedChecks);
        if (isChecked) { newSet.add(id); } else { newSet.delete(id); }
        setSelectedChecks(newSet);
    };

    const handleExecuteChecks = async () => {
        if (selectedChecks.size === 0) { setError("Please select at least one check to run."); return; }
        if (!planResponse) { setError("Plan is missing. Please go back."); return; }
        setIsLoading(true); setError(null);
        const checksToRun = proposedChecks.filter(c => selectedChecks.has(c.check_id));
        try {
            const fullTableName = planResponse.table_name;
            const quotedTableName = fullTableName
            .split('.')
            .map(part => `"${part}"`)
            .join('.');
            console.log(quotedTableName);
            const res = await postExecuteQualityChecks(connectionString, quotedTableName, checksToRun);
            setValidationReport(res);
            setStep(3);
        } catch (err: any) { setError(err.message || 'Failed to execute checks.'); }
        finally { setIsLoading(false); }
    };
    
    const handleReset = () => {
        setStep(1);
        setError(null);
        setPlanResponse(null);
        setDataProfile(null);
        setValidationReport(null);
        setSelectedChecks(new Set());
    };

    return (
        <div className="min-h-[calc(100vh-80px)] w-full bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] flex items-start justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-6xl">
                 <div className="p-4 md:p-6">
                        <StepIndicator currentStep={step} />
                        
                        {error && (
                            <div className="mb-6 flex items-center gap-3 p-3 bg-red-900/40 border border-red-500/50 rounded-lg text-red-300 text-sm animate-fade-in max-w-3xl mx-auto">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        {step === 1 && (
                            <div className="card-border rounded-2xl bg-slate-900/70 backdrop-blur-sm max-w-lg mx-auto p-8 space-y-6 animate-fade-in">
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-white flex items-center justify-center gap-2">
                                        <Target className="text-amber-400"/> Define Scope
                                    </h3>
                                    <p className="text-slate-400 mt-1 text-sm">Provide details to profile data and generate a quality plan.</p>
                                </div>
                                <fieldset className="space-y-4">
                                    <div>
                                        <label htmlFor="connStr" className="text-sm font-medium text-slate-300 block mb-2">Connection String (Optional)</label>
                                        <div className="relative">
                                            <input id="connStr" type={showConnStr ? 'text' : 'password'} value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="Defaults to server configuration" className="w-full input-glass pr-10"/>
                                            <button type="button" onClick={() => setShowConnStr(!showConnStr)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200" aria-label={showConnStr ? "Hide connection string" : "Show connection string"}>
                                                {showConnStr ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="tableName" className="text-sm font-medium text-slate-300 block mb-2">Table Name</label>
                                        <input id="tableName" type="text" value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g., public.users" className="w-full input-glass"/>
                                    </div>
                                </fieldset>
                                <div className="pt-4 flex justify-end">
                                    <button onClick={handleGeneratePlan} disabled={isLoading || !tableName} className="btn-primary bg-teal-600 hover:bg-teal-500">
                                        {isLoading ? <><LoaderCircle className="animate-spin w-5 h-5"/> Analyzing...</> : <><PlayCircle className="w-5 h-5"/> Generate Plan</>}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {(step === 2 && planResponse) && (
                             <div className="w-full bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/20 p-6 md:p-8 animate-fade-in">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    <DataProfileSidebar profile={dataProfile} />
                                    <div className="flex-grow space-y-6 lg:border-l lg:border-slate-700/80 lg:pl-8">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-400"/>Review AI-Generated Plan</h4>
                                                <div className="flex gap-4"><button onClick={() => setSelectedChecks(new Set(proposedChecks.map(c => c.check_id)))} className="text-xs font-medium text-slate-300 hover:text-white transition-colors">Select All</button><button onClick={() => setSelectedChecks(new Set())} className="text-xs font-medium text-slate-300 hover:text-white transition-colors">Deselect All</button></div>
                                            </div>
                                            <div className="max-h-[34rem] overflow-y-auto space-y-3 rounded-lg bg-slate-900/50 p-3 border border-slate-800 shadow-inner shadow-black/20">
                                                {proposedChecks.length > 0 ? proposedChecks.map((check) => (<CheckItem key={check.check_id} check={check} isChecked={selectedChecks.has(check.check_id)} onCheckChange={handleCheckChange} />)) : <p className="text-slate-400 text-center p-4">No checks were proposed by the AI.</p>}
                                            </div>
                                        </div>
                                        <div className="flex gap-4 pt-4 border-t border-slate-700/80">
                                            <button onClick={handleReset} disabled={isLoading} className="w-1/3 btn-secondary"><ChevronLeft className="w-5 h-5"/> Back</button>
                                            <button onClick={handleExecuteChecks} disabled={isLoading || selectedChecks.size === 0} className="w-2/3 btn-primary bg-amber-600 hover:bg-amber-500">
                                                {isLoading ? <><LoaderCircle className="animate-spin w-5 h-5"/> Executing...</> : <><PlayCircle className="w-5 h-5"/> Run Selected Checks ({selectedChecks.size})</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* {(step === 3 && validationReport) && (
                             <div className="w-full bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/20 p-6 md:p-8 animate-fade-in">
                                <ReportSummary report={validationReport} />
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-white flex items-center gap-2 mb-4">
                                        <Sparkles className="w-5 h-5 text-amber-400"/>Detailed Report: <span className="text-amber-300">{validationReport.table_name}</span>
                                    </h4>
                                    <div className="max-h-[30rem] overflow-y-auto space-y-2 rounded-lg bg-slate-900/50 p-3 border border-slate-800 shadow-inner shadow-black/20">
                                        {validationReport.validation_results.map((result) => (
                                            <div key={result.check_id} className={`p-4 rounded-lg border ${result.is_valid ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                                <div className="flex items-center justify-between"><p className="font-medium text-slate-100">{result.rule_name}</p>{result.is_valid ? (<span className="flex items-center gap-1.5 text-xs font-semibold text-green-400"><CheckCircle className="w-4 h-4"/> PASS</span>) : (<span className="flex items-center gap-1.5 text-xs font-semibold text-red-400"><XCircle className="w-4 h-4"/> FAIL</span>)}</div>
                                                {!result.is_valid && (<p className="text-sm text-red-300 mt-2 font-mono bg-red-900/30 px-2 py-1 rounded w-fit">{result.invalid_count.toLocaleString()} of {result.total_rows.toLocaleString()} rows failed this check.</p>)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-6 mt-6 border-t border-slate-700/80">
                                  <button onClick={handleReset} className="w-full btn-secondary"><RefreshCw className="w-5 h-5"/> Start New Analysis</button>
                                </div>
                            </div>
                        )} */}
                        {(step === 3 && validationReport) && (
                             <div>
                                <ReportDashboard report={validationReport} />
                                <div className="pt-6 mt-6 border-t border-slate-700/80">
                                  <button onClick={handleReset} className="w-full btn-secondary"><RefreshCw className="w-5 h-5"/> Start New Analysis</button>
                                </div>
                            </div>
                        )}
                    </div>
            </div>
        </div>
    );
};

export default DataQualityAgentPage;