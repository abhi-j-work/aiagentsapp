import React, { useState } from 'react';
import { 
    LoaderCircle, 
    AlertTriangle, 
    PlayCircle, 
    Database, 
    Sparkles, 
    ShieldCheck, 
    CheckCircle, 
    XCircle, 
    ChevronLeft, 
    RefreshCw, 
    ClipboardList
} from 'lucide-react';
import {
    postGenerateQualityPlan,
    postExecuteQualityChecks,
    type ProposedQualityCheck,
    type ExecuteQualityChecksResponse,
} from '../services/api';

// ===================================================
// SUB-COMPONENT: Displays the AI-generated quality plan
// ===================================================

const QualityPlanDisplay = ({ plan, selectedChecks, onCheckChange, onSelectAll, onDeselectAll }: { plan: ProposedQualityCheck[], selectedChecks: Set<string>, onCheckChange: (id: string, isChecked: boolean) => void, onSelectAll: () => void, onDeselectAll: () => void }) => (
    <div className="animate-fade-in space-y-3">
        <div className="flex justify-between items-center">
            <h4 className="font-semibold text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-amber-400"/>AI-Generated Quality Plan</h4>
            <div className="flex gap-4">
                <button onClick={onSelectAll} className="text-xs font-medium text-slate-300 hover:text-white transition-colors">Select All</button>
                <button onClick={onDeselectAll} className="text-xs font-medium text-slate-300 hover:text-white transition-colors">Deselect All</button>
            </div>
        </div>
        <div className="max-h-[24rem] overflow-y-auto space-y-2 rounded-lg bg-slate-800/50 p-3 border border-slate-700">
            {plan.map((check) => (
                <label key={check.check_id} className="flex items-start p-3 bg-slate-800/60 rounded-md cursor-pointer hover:bg-slate-700/60 border border-transparent hover:border-amber-500/50 transition-all">
                    <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                        checked={selectedChecks.has(check.check_id)}
                        onChange={(e) => onCheckChange(check.check_id, e.target.checked)}
                    />
                    <div className="ml-3 text-sm">
                        <p className="font-medium text-slate-100">{check.rule_name}</p>
                        <p className="text-slate-400 mt-1">{check.rule_description}</p>
                    </div>
                </label>
            ))}
        </div>
    </div>
);

// ===================================================
// SUB-COMPONENT: Displays the final validation report
// ===================================================

const ValidationReportDisplay = ({ report }: { report: ExecuteQualityChecksResponse }) => (
    <div className="animate-fade-in space-y-3">
        <h4 className="font-semibold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400"/>Validation Report: <span className="text-amber-300">{report.table_name}</span></h4>
        <div className="max-h-[30rem] overflow-y-auto space-y-2 rounded-lg bg-slate-900/50 p-3 border border-slate-700">
            {report.validation_results.map((result) => (
                <div key={result.check_id} className={`p-4 rounded-md border ${result.is_valid ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-100">{result.rule_name}</p>
                        {result.is_valid ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400"><CheckCircle className="w-4 h-4"/> PASS</span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400"><XCircle className="w-4 h-4"/> FAIL</span>
                        )}
                    </div>
                    {!result.is_valid && (
                         <p className="text-sm text-red-300 mt-2 font-mono bg-red-900/30 px-2 py-1 rounded w-fit">{result.invalid_count} of {result.total_rows} rows failed this check.</p>
                    )}
                </div>
            ))}
        </div>
    </div>
);

// ===================================================
// SUB-COMPONENT: The visual step indicator
// ===================================================

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
    const steps = [
        { num: 1, name: "Define Scope", icon: <Database/> },
        { num: 2, name: "Review Plan", icon: <ClipboardList/> },
        { num: 3, name: "View Report", icon: <Sparkles/> }
    ];

    return (
        <nav className="flex items-center justify-center space-x-4 mb-8" aria-label="Progress">
            {steps.map((step, index) => (
                <React.Fragment key={step.name}>
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep >= step.num ? 'bg-amber-500 border-amber-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
                           {React.cloneElement(step.icon, { className: 'w-5 h-5' })}
                        </div>
                        <p className={`mt-2 text-xs font-medium w-20 ${currentStep >= step.num ? 'text-amber-400' : 'text-slate-500'}`}>{step.name}</p>
                    </div>
                    {index < steps.length - 1 && <div className={`flex-1 h-0.5 transition-all duration-500 ${currentStep > step.num ? 'bg-amber-500' : 'bg-slate-700'}`}></div>}
                </React.Fragment>
            ))}
        </nav>
    );
};


// ===================================================
// MAIN PAGE COMPONENT
// ===================================================
const DataQualityAgentPage = () => {
    // UI State
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Form Input State
    const [connectionString, setConnectionString] = useState('');
    const [tableName, setTableName] = useState('');
    
    // Data State
    const [proposedChecks, setProposedChecks] = useState<ProposedQualityCheck[] | null>(null);
    const [selectedChecks, setSelectedChecks] = useState<Set<string>>(new Set());
    const [validationReport, setValidationReport] = useState<ExecuteQualityChecksResponse | null>(null);

    // API Handlers
    const handleGeneratePlan = async () => {
        if (!connectionString || !tableName) {
            setError("Connection string and table name are required.");
            return;
        }
        setIsLoading(true); 
        setError(null);
        try {
            const res = await postGenerateQualityPlan(connectionString, tableName);
            setProposedChecks(res.proposed_checks);
            setSelectedChecks(new Set(res.proposed_checks.map(c => c.check_id)));
            setStep(2);
        } catch (err: any) { 
            setError(err.message || 'Failed to generate plan.'); 
        } finally { 
            setIsLoading(false); 
        }
    };
    
    const handleCheckChange = (id: string, isChecked: boolean) => {
        const newSet = new Set(selectedChecks);
        if (isChecked) newSet.add(id); else newSet.delete(id);
        setSelectedChecks(newSet);
    };

    const handleExecuteChecks = async () => {
        if (selectedChecks.size === 0) {
            setError("Please select at least one check to run.");
            return;
        }
        setIsLoading(true); 
        setError(null);
        const checksToRun = proposedChecks?.filter(c => selectedChecks.has(c.check_id)) || [];
        try {
            const res = await postExecuteQualityChecks(connectionString, tableName, checksToRun);
            setValidationReport(res);
            setStep(3);
        } catch (err: any) { 
            setError(err.message || 'Failed to execute checks.'); 
        } finally { 
            setIsLoading(false); 
        }
    };
    
    const handleReset = () => {
        setStep(1);
        setError(null);
        setProposedChecks(null);
        setValidationReport(null);
        setTableName('');
        setConnectionString('');
        setSelectedChecks(new Set());
    };

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex items-start justify-center p-4 md:p-8">
            <div className="w-full max-w-3xl">
                <div className="relative card-border overflow-hidden rounded-2xl flex flex-col animate-vertical-float">
                    <div className="p-6 border-b border-amber-500/20">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-3"><Sparkles className="w-6 h-6 text-amber-400" />Data Quality AI Agent</h2>
                        <p className="text-sm text-slate-400 mt-1">Automatically generate and execute data quality checks to ensure reliability.</p>
                    </div>

                    <div className="p-6 md:p-8">
                        <StepIndicator currentStep={step} />
                        
                        {error && (
                            <div className="mb-6 flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        {step === 1 && (
                            <div className="space-y-6 animate-fade-in max-w-md mx-auto">
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="connStr" className="text-sm font-medium text-slate-300 block mb-2">Connection String</label>
                                        <input id="connStr" type="password" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="postgresql://..." className="w-full input-glass"/>
                                    </div>
                                    <div>
                                        <label htmlFor="tableName" className="text-sm font-medium text-slate-300 block mb-2">Table Name</label>
                                        <input id="tableName" type="text" value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g., customers" className="w-full input-glass"/>
                                    </div>
                                </div>
                                <button onClick={handleGeneratePlan} disabled={isLoading || !connectionString || !tableName} className="w-full btn-primary bg-teal-600 hover:bg-teal-700">
                                    {isLoading ? <><LoaderCircle className="animate-spin w-5 h-5"/> Generating Plan...</> : <><PlayCircle className="w-5 h-5"/> Generate Quality Plan</>}
                                </button>
                            </div>
                        )}
                        
                        {step === 2 && proposedChecks && (
                             <div className="space-y-6 animate-fade-in">
                                <QualityPlanDisplay 
                                    plan={proposedChecks} 
                                    selectedChecks={selectedChecks} 
                                    onCheckChange={handleCheckChange}
                                    onSelectAll={() => setSelectedChecks(new Set(proposedChecks.map(c => c.check_id)))}
                                    onDeselectAll={() => setSelectedChecks(new Set())}
                                />
                                <div className="flex gap-4">
                                     <button onClick={() => setStep(1)} disabled={isLoading} className="w-1/3 btn-secondary">
                                        <ChevronLeft className="w-5 h-5"/> Back
                                    </button>
                                    <button onClick={handleExecuteChecks} disabled={isLoading || selectedChecks.size === 0} className="w-2/3 btn-primary bg-amber-600 hover:bg-amber-700">
                                        {isLoading ? <><LoaderCircle className="animate-spin w-5 h-5"/> Executing...</> : <><PlayCircle className="w-5 h-5"/> Run Selected Checks ({selectedChecks.size})</>}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {step === 3 && validationReport && (
                             <div className="space-y-4 animate-fade-in">
                                <ValidationReportDisplay report={validationReport} />
                                <button onClick={handleReset} className="w-full btn-secondary">
                                    <RefreshCw className="w-5 h-5"/> Start New Report
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataQualityAgentPage;