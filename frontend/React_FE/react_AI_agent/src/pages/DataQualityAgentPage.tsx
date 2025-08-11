import React, { useState, useMemo } from 'react';
import {
    LoaderCircle, AlertTriangle, PlayCircle, Database, Sparkles, ShieldCheck,
    ChevronLeft, RefreshCw, ClipboardList, BarChart3, Fingerprint, Ban, PenTool,
    KeyRound, HelpCircle, Target, Eye, EyeOff, FileText, Bot, Gavel, Star, ArrowRight
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
} from '../services/api';
import ReportDashboard from './ReportDashboard';

// --- Prop Types for Sub-Components ---
interface CheckItemProps {
    check: ProposedQualityCheck;
    isChecked: boolean;
    onCheckChange: (id: string, isChecked: boolean) => void;
}

interface DataProfileDisplayProps {
    profile: GenerateDataProfileResponse | null;
}

interface StepIndicatorProps {
    currentStep: number;
}

// --- Style Constants ---
const cardContainerStyle = "card-border rounded-2xl bg-slate-900/70 backdrop-blur-sm animate-fade-in";
const cardHeaderStyle = "p-6 border-b border-indigo-500/30 flex justify-between items-center";
const cardTitleStyle = "text-xl font-semibold text-white flex items-center gap-3";
const cardSubtitleStyle = "text-sm text-slate-400 mt-1";
const cardBodyStyle = "p-6";
const inputBaseStyle = "w-full px-4 py-2 glass rounded-lg border border-slate-700 bg-slate-800/50 text-white focus:border-indigo-400 focus:outline-none transition";
const primaryButtonStyle = "group btn-primary bg-indigo-600 text-white hover:bg-indigo-500 transition-all flex items-center text-sm font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed";

// --- Sub-Components (Unchanged) ---

const CheckItem: React.FC<CheckItemProps> = ({ check, isChecked, onCheckChange }) => {
    // ... No changes to this component ...
    const getIcon = () => {
        const name = check.rule_name.toLowerCase();
        if (name.includes('unique')) return <Fingerprint className="w-5 h-5 text-indigo-400" />;
        if (name.includes('null')) return <Ban className="w-5 h-5 text-rose-400" />;
        if (name.includes('format')) return <PenTool className="w-5 h-5 text-sky-400" />;
        if (name.includes('primary key')) return <KeyRound className="w-5 h-5 text-amber-400" />;
        return <HelpCircle className="w-5 h-5 text-slate-500" />;
    };
    return (
        <label className="flex items-start p-3 bg-slate-800/60 rounded-lg cursor-pointer hover:bg-slate-700/80 border border-slate-700/50 hover:border-indigo-500/50 transition-all">
            <div className="flex-shrink-0 mt-0.5 mr-4">{getIcon()}</div>
            <div className="flex-grow">
                <p className="font-medium text-slate-100">{check.rule_name}</p>
                <p className="text-slate-400 mt-1 text-sm">{check.rule_description}</p>
            </div>
            <input type="checkbox" className="ml-4 mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900" checked={isChecked} onChange={(e) => onCheckChange(check.check_id, e.target.checked)} />
        </label>
    );
};

const DataProfileDisplay: React.FC<DataProfileDisplayProps> = ({ profile }) => {
    // ... No changes to this component, renamed for clarity ...
    if (!profile || !profile.columns || profile.columns.length === 0) {
        return <p className="text-sm text-slate-400">Profile data will appear here after analysis.</p>;
    }
    interface AIColumnProfile { column_name: string; inferred_type: string; assumptions_about_data: string; potential_quality_risks: string; common_patterns_or_values: string; }
    return (
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/80">
            <h5 className="font-semibold text-white flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                AI Data Profile: <span className="text-indigo-300">{profile.table_name}</span>
            </h5>
            <ul className="text-sm space-y-2 pt-2">
                <li className="flex justify-between items-center text-slate-300">
                    <span><Database className="inline w-4 h-4 mr-2"/>Columns Analyzed</span>
                    <span className="font-mono text-indigo-300">{profile.columns.length}</span>
                </li>
            </ul>
            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                {profile.columns.map((col: AIColumnProfile) => (
                    <details key={col.column_name} className="bg-slate-800/50 rounded-md transition-colors hover:bg-slate-800/80">
                         <summary className="p-2 cursor-pointer font-medium text-slate-200 text-sm list-none flex items-center justify-between">
                            {col.column_name}
                            <span className="text-xs font-mono text-indigo-300 bg-indigo-900/50 px-2 py-0.5 rounded-md">{col.inferred_type}</span>
                        </summary>
                        <div className="p-3 border-t border-slate-700 text-xs text-slate-400 space-y-2">
                            <div><span className="font-semibold text-slate-300 block mb-0.5">Assumptions:</span><span>{col.assumptions_about_data}</span></div>
                            <div><span className="font-semibold text-slate-300 block mb-0.5">Potential Risks:</span><span>{col.potential_quality_risks}</span></div>
                            <div><span className="font-semibold text-slate-300 block mb-0.5">Hypothetical Patterns:</span><span>{col.common_patterns_or_values}</span></div>
                        </div>
                    </details>
                ))}
            </div>
        </div>
    );
};

// --- UPDATED Step Indicator ---
const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
    const steps = [
        { num: 1, name: "Define Scope", icon: <Target/> },
        { num: 2, name: "Profile & Define Rules", icon: <FileText/> }, // NEW STEP
        { num: 3, name: "Review AI Plan", icon: <ClipboardList/> },
        { num: 4, name: "View Report", icon: <Sparkles/> }
    ];

    return (
        <nav className="flex items-center justify-center space-x-2 md:space-x-4 mb-10" aria-label="Progress">
            {steps.map((step, index) => (
                <React.Fragment key={step.name}>
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep >= step.num ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                           {React.cloneElement(step.icon, { className: 'w-6 h-6' })}
                        </div>
                        <p className={`mt-2 text-xs font-medium w-24 ${currentStep >= step.num ? 'text-indigo-400' : 'text-slate-500'}`}>{step.name}</p>
                    </div>
                    {index < steps.length - 1 && <div className={`flex-1 h-0.5 transition-all duration-500 ${currentStep > step.num ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>}
                </React.Fragment>
            ))}
        </nav>
    );
};

const AiJudgeResult: React.FC<{ evaluation?: { score: number; reasoning: string } | null }> = ({ evaluation }) => {
    // ... No changes to this component ...
    if (!evaluation) return null;
    const getStarColor = (score: number) => {
        if (score >= 4) return 'text-green-400';
        if (score === 3) return 'text-yellow-400';
        return 'text-red-400';
    };
    return (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg mb-6">
            <h4 className="font-semibold text-white flex items-center gap-2 mb-2 text-base"><Gavel className="w-5 h-5 text-indigo-400" />AI Judge: Plan Evaluation</h4>
            <div className="flex items-start gap-4">
                <div className={`flex items-center gap-1 font-bold text-lg ${getStarColor(evaluation.score)}`}>{evaluation.score} <Star className="w-5 h-5 fill-current" /></div>
                <p className="text-sm text-slate-400 flex-1 pt-0.5">{evaluation.reasoning}</p>
            </div>
        </div>
    );
};

const modelOptions = [ "llama-3-70b","gpt-4o", "claude-3-opus", "gemini-1.5-pro" ];

// --- Main Page Component (UPDATED) ---
const DataQualityAgentPage: React.FC = () => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // UPDATED to 4 steps
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionString, setConnectionString] = useState<string>('');
    const [tableName, setTableName] = useState<string>('');
    const [dataProfile, setDataProfile] = useState<GenerateDataProfileResponse | null>(null);
    const [planResponse, setPlanResponse] = useState<GenerateQualityPlanResponse | null>(null);
    const [selectedChecks, setSelectedChecks] = useState<Set<string>>(new Set());
    const [validationReport, setValidationReport] = useState<ExecuteQualityChecksResponse | null>(null);
    const [showConnStr, setShowConnStr] = useState<boolean>(false);
    const [customRules, setCustomRules] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>(modelOptions[0]);

    const proposedChecks = useMemo(() => planResponse?.proposed_checks || [], [planResponse]);

    // UPDATED: Step 1 now only generates the profile
    const handleGenerateProfile = async () => {
        if (!tableName) { setError("Table name is required."); return; }
        setIsLoading(true); setError(null); setDataProfile(null);
        try {
            const profileRes = await postGenerateDataProfile(connectionString, tableName);
            setDataProfile(profileRes);
            setStep(2); // Move to the new Step 2
        } catch (err: any) { 
            setError(err.message || 'Failed to generate data profile.'); 
        } finally { 
            setIsLoading(false); 
        }
    };
    
    // NEW: Step 2 generates the plan using custom rules
    const handleGeneratePlanWithRules = async () => {
        if (!tableName) { setError("Table name is missing."); return; }
        setIsLoading(true); setError(null); setPlanResponse(null);
        try {
            const planRes = await postGenerateQualityPlan(connectionString, tableName, customRules);
            setPlanResponse(planRes);
            setSelectedChecks(new Set(planRes.proposed_checks.map(c => c.check_id)));
            setStep(3); // Move to Step 3
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
            const res = await postExecuteQualityChecks(connectionString, planResponse.table_name, checksToRun);
            setValidationReport(res);
            setStep(4); // Move to Step 4
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

    const handleBack = (targetStep: 1 | 2 | 3) => {
        setStep(targetStep);
        setError(null);
    }

    return (
        <div className="min-h-[calc(100vh-80px)] w-full bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] flex items-start justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-6xl">
                 <div className="p-4 md:p-6">
                        <StepIndicator currentStep={step} />
                        
                        {error && (
                            <div className="mb-6 flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in max-w-3xl mx-auto">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                        
                        {step === 1 && (
                            <div className={`${cardContainerStyle} max-w-2xl mx-auto`}>
                                <div className={cardHeaderStyle}>
                                    <div>
                                        <h3 className={cardTitleStyle}><Target className="w-6 h-6 text-indigo-400"/> Step 1: Define Scope</h3>
                                        <p className={cardSubtitleStyle}>Provide connection details and the target table name.</p>
                                    </div>
                                </div>
                                <div className={cardBodyStyle}>
                                    <fieldset className="space-y-5">
                                        <div>
                                            <label htmlFor="connStr" className="text-sm font-medium text-slate-300 block mb-2">Connection String (Optional)</label>
                                            <div className="relative"><input id="connStr" type={showConnStr ? 'text' : 'password'} value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="Defaults to server configuration" className={`${inputBaseStyle} pr-10`}/><button type="button" onClick={() => setShowConnStr(!showConnStr)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200" aria-label={showConnStr ? "Hide" : "Show"}>{showConnStr ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}</button></div>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-5">
                                            <div>
                                                <label htmlFor="tableName" className="text-sm font-medium text-slate-300 block mb-2">Table Name</label>
                                                <input id="tableName" type="text" value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="e.g., public.users" className={inputBaseStyle}/>
                                            </div>
                                            <div>
                                                <label htmlFor="modelChoice" className="text-sm font-medium text-slate-300 block mb-2 flex items-center gap-2"><Bot className="w-4 h-4" /> Model</label>
                                                <select id="modelChoice" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className={inputBaseStyle}>{modelOptions.map(model => ( <option key={model} value={model} className="bg-slate-800 text-white">{model}</option>))}</select>
                                            </div>
                                        </div>
                                    </fieldset>
                                </div>
                                <div className="p-6 pt-2 flex justify-end">
                                    <button onClick={handleGenerateProfile} disabled={isLoading || !tableName} className={primaryButtonStyle}>{isLoading ? <><LoaderCircle className="animate-spin w-5 h-5 mr-2"/> Profiling...</> : <>Profile Table <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" /></>}</button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className={`${cardContainerStyle} max-w-5xl mx-auto`}>
                                <div className={cardHeaderStyle}>
                                    <h3 className={cardTitleStyle}><FileText className="w-6 h-6 text-indigo-400"/> Step 2: Profile & Define Rules</h3>
                                </div>
                                <div className="flex flex-col lg:flex-row gap-8 p-6">
                                    <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0"><DataProfileDisplay profile={dataProfile} /></div>
                                    <div className="flex-grow flex flex-col space-y-6 lg:border-l lg:border-slate-700/80 lg:pl-8">
                                        <div>
                                            <label htmlFor="customRules" className="text-base font-medium text-slate-200 block mb-2">Custom Business Rules</label>
                                            <p className="text-sm text-slate-400 mb-3">Add any specific rules the AI must follow. The AI will see the profile on the left for context.</p>
                                            <textarea id="customRules" value={customRules} onChange={(e) => setCustomRules(e.target.value)} placeholder="e.g., Ensure all 'order_id' values are positive integers." className={`${inputBaseStyle} !h-40`} rows={5}/>
                                        </div>
                                        <div className="flex justify-between items-center pt-6 border-t border-slate-700/80">
                                            <button onClick={() => handleBack(1)} disabled={isLoading} className={`${primaryButtonStyle} bg-slate-700 hover:bg-slate-600`}><ChevronLeft className="w-5 h-5 mr-1.5"/> Back</button>
                                            <button onClick={handleGeneratePlanWithRules} disabled={isLoading} className={primaryButtonStyle}>{isLoading ? <><LoaderCircle className="animate-spin w-5 h-5 mr-2"/> Generating...</> : <>Generate AI Plan <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" /></>}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {step === 3 && planResponse && (
                             <div className={`${cardContainerStyle} max-w-5xl mx-auto`}>
                                <div className={cardHeaderStyle}>
                                    <h3 className={cardTitleStyle}><ShieldCheck className="w-6 h-6 text-indigo-400"/>Step 3: Review AI-Generated Plan</h3>
                                </div>
                                <div className="p-6">
                                    <AiJudgeResult evaluation={planResponse.evaluation} />
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-semibold text-white">Select checks to run:</h4>
                                        <div className="flex gap-4">
                                            <button onClick={() => setSelectedChecks(new Set(proposedChecks.map(c => c.check_id)))} className="text-xs font-medium text-slate-300 hover:text-white transition-colors">Select All</button>
                                            <button onClick={() => setSelectedChecks(new Set())} className="text-xs font-medium text-slate-300 hover:text-white transition-colors">Deselect All</button>
                                        </div>
                                    </div>
                                    <div className="max-h-[28rem] overflow-y-auto space-y-3 rounded-lg bg-slate-900/50 p-3 border border-slate-800 shadow-inner">
                                        {proposedChecks.length > 0 ? proposedChecks.map((check) => (<CheckItem key={check.check_id} check={check} isChecked={selectedChecks.has(check.check_id)} onCheckChange={handleCheckChange} />)) : <p className="text-slate-400 text-center p-4">No checks were proposed.</p>}
                                    </div>
                                    <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-700/80">
                                        <button onClick={() => handleBack(2)} disabled={isLoading} className={`${primaryButtonStyle} bg-slate-700 hover:bg-slate-600`}><ChevronLeft className="w-5 h-5 mr-1.5"/> Back</button>
                                        <button onClick={handleExecuteChecks} disabled={isLoading || selectedChecks.size === 0} className={primaryButtonStyle}>{isLoading ? <><LoaderCircle className="animate-spin w-5 h-5 mr-2"/> Executing...</> : <>Run Checks ({selectedChecks.size}) <ArrowRight className="w-4 h-4 ml-1.5" /></>}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {step === 4 && validationReport && (
                             <div className={`${cardContainerStyle} max-w-5xl mx-auto`}>
                                <div className={cardHeaderStyle}><h3 className={cardTitleStyle}><Sparkles className="w-6 h-6 text-indigo-400"/>Step 4: Detailed Report</h3></div>
                                <div className={cardBodyStyle}>
                                    <ReportDashboard report={validationReport} />
                                    <div className="pt-6 mt-6 border-t border-slate-700/80 flex justify-center">
                                      <button onClick={handleReset} className="group btn-secondary flex items-center text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-900/50 text-indigo-300 hover:bg-indigo-900 border border-indigo-700/50"><RefreshCw className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:rotate-180"/> Start New Analysis</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
            </div>
        </div>
    );
};

export default DataQualityAgentPage;