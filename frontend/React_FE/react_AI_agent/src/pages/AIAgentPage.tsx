import { useState } from 'react';
import {
    Database, LoaderCircle, AlertTriangle, PlayCircle, Table, ChevronsRight, Link2,
    ShieldCheck, FileText, CheckCircle, Eye, UserCircle
} from 'lucide-react';
import {
    postExtractSchema, postExplainIntegrity, postClassifyData, postGenerateMaskingSQL, postApplyMaskingPlan,
    postListGovernedViews, postFetchViewData,
    type ExtractedSchema, type ReferentialIntegrityResponse, type ClassificationResult, type FetchViewDataResponse
} from '../services/api';

// ===================================================
// SUB-COMPONENTS for displaying results
// ===================================================

const SchemaDisplay = ({ schema }: { schema: ExtractedSchema }) => (
    <div className="animate-fade-in">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><Database className="w-4 h-4 text-indigo-400" />Extracted Schema</h4>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 bg-slate-800/60 rounded-md p-3">
            {Object.entries(schema.tables).map(([tableName, tableData]) => (
                <div key={tableName} className="text-xs">
                    <p className="font-semibold text-slate-300 flex items-center gap-2"><Table className="w-3 h-3 text-slate-400" />{tableName}</p>
                    <ul className="mt-2 pl-4 space-y-1">
                        {tableData.columns.map(col => <li key={col.column_name} className="text-slate-400 flex items-center"><ChevronsRight className="w-3 h-3 mr-2 text-indigo-500" />{col.column_name} <span className="ml-2 text-indigo-400/70">({col.data_type})</span></li>)}
                    </ul>
                </div>
            ))}
        </div>
    </div>
);

const IntegrityReport = ({ data }: { data: ReferentialIntegrityResponse }) => (
    <div className="animate-fade-in">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><Link2 className="w-4 h-4 text-indigo-400" />AI Generated Integrity Report</h4>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 bg-slate-800/60 rounded-md p-3">
            <h5 className="text-sm font-semibold text-slate-300">Relationships</h5>
            {data.relationship_explanations.map((rel, i) => <div key={i} className="text-xs p-2 bg-slate-900/70 rounded"><p className="font-semibold text-slate-300">{rel.business_rule}</p><p className="text-slate-400 mt-1"><span className="font-medium text-red-400/80">Impact:</span> {rel.impact_of_change}</p></div>)}
            <h5 className="text-sm font-semibold text-slate-300 pt-2">Foundational Tables</h5>
            {data.foundational_tables.map((tbl, i) => <div key={i} className="text-xs p-2 bg-slate-900/70 rounded"><p className="font-semibold text-slate-300">{tbl.table_name}: <span className="font-normal">{tbl.business_role}</span></p><p className="text-slate-400 mt-1"><span className="font-medium text-red-400/80">Impact:</span> {tbl.impact_of_change}</p></div>)}
        </div>
    </div>
);

const ClassificationDisplay = ({ classifications }: { classifications: ClassificationResult[] }) => (
    <div className="animate-fade-in">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-indigo-400" />AI Data Classification</h4>
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 bg-slate-800/60 rounded-md p-3">
            {classifications.map(table => (
                <div key={table.table_name} className="text-xs"><p className="font-semibold text-slate-300 flex items-center gap-2"><Table className="w-3 h-3 text-slate-400" />{table.table_name}</p>
                    <ul className="mt-2 pl-4 space-y-1">{table.columns.map(col => <li key={col.column_name} className="text-slate-400 flex items-center justify-between"><span>{col.column_name}</span><span className={`font-medium px-2 py-0.5 rounded-full text-xs ${col.classification === 'PII' || col.classification === 'Sensitive' ? 'text-red-300 bg-red-900/50' : 'text-green-300 bg-green-900/50'}`}>{col.classification}</span></li>)}</ul>
                </div>
            ))}
        </div>
    </div>
);

const SqlDisplay = ({ statements }: { statements: string[] }) => (
    <div className="animate-fade-in">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-indigo-400" />AI Generated SQL Plan</h4>
        <div className="max-h-64 overflow-y-auto bg-black p-4 rounded-md border border-slate-700"><pre className="text-xs text-slate-300 whitespace-pre-wrap"><code>{statements.join('\n\n---\n\n')}</code></pre></div>
    </div>
);

const GovernedViewList = ({ views, onSelectView, isLoading, selectedView }: { views: string[], onSelectView: (viewName: string) => void, isLoading: boolean, selectedView: string | null }) => (
    <div className="animate-fade-in">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-indigo-400" />Governed Views</h4>
        <div className="space-y-2 bg-slate-800/60 rounded-md p-3">
            {views.length === 0 ? (
                <p className="text-slate-400 text-sm text-center p-4">No governed views found.</p>
            ) : views.map(viewName => (
                <button
                    key={viewName}
                    onClick={() => onSelectView(viewName)}
                    disabled={isLoading}
                    className={`w-full text-left text-sm p-2 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 ${selectedView === viewName ? 'bg-indigo-600 text-white' : 'bg-slate-900/70 text-slate-300 hover:bg-slate-700'}`}
                >
                    {isLoading && selectedView === viewName ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Table className="w-4 h-4 text-slate-400" />}
                    {viewName}
                </button>
            ))}
        </div>
    </div>
);

const ViewDataDisplay = ({ viewData }: { viewData: FetchViewDataResponse }) => {
    if (!viewData.data || viewData.data.length === 0) {
        return <div className="text-center text-slate-400 p-4 mt-4 animate-fade-in">No data to display for this view.</div>;
    }
    const headers = Object.keys(viewData.data[0]);

    return (
        <div className="animate-fade-in mt-4">
            <h5 className="font-semibold text-white mb-3">Data from: <span className="text-indigo-400">{viewData.view_name}</span></h5>
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-800 sticky top-0 z-10">
                        <tr>
                            {headers.map(header => <th key={header} className="p-2 font-medium text-slate-300">{header}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {viewData.data.map((row, rowIndex) => (
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
const AIAgentPage = () => {
    // UI State
    const [viewMode, setViewMode] = useState<'initial' | 'results'>('initial');
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [connectionString, setConnectionString] = useState('');

    // Data State
    const [schema, setSchema] = useState<ExtractedSchema | null>(null);
    const [integrityReport, setIntegrityReport] = useState<ReferentialIntegrityResponse | null>(null);
    const [classifications, setClassifications] = useState<ClassificationResult[] | null>(null);
    const [sqlStatements, setSqlStatements] = useState<string[] | null>(null);
    const [finalMessage, setFinalMessage] = useState<string | null>(null);
    const [governedViews, setGovernedViews] = useState<string[] | null>(null);
    const [selectedView, setSelectedView] = useState<string | null>(null);
    const [viewData, setViewData] = useState<FetchViewDataResponse | null>(null);
    const [viewingRole, setViewingRole] = useState<string>('admin');

    // API Handlers
    const handleRunAnalysis = async () => {
        if (!connectionString) { setError("Please provide a database connection string."); return; }
        setIsLoading(true); setCurrentStep('Analyzing...'); setError(null);
        setSchema(null); setIntegrityReport(null); setClassifications(null);
        setSqlStatements(null); setFinalMessage(null); setGovernedViews(null);
        setViewData(null); setSelectedView(null);
        try {
            const [schemaResponse, integrityResponse] = await Promise.all([postExtractSchema(connectionString), postExplainIntegrity(connectionString)]);
            const extractedSchemaData = (schemaResponse as any).schema_data || schemaResponse;
            if (extractedSchemaData?.tables) setSchema(extractedSchemaData); else throw new Error("Invalid schema structure.");
            if (integrityResponse?.relationship_explanations) setIntegrityReport(integrityResponse); else throw new Error("Invalid integrity report.");
            setViewMode('results');
        } catch (err: any) { setError(err.message || 'Analysis failed.'); }
        finally { setIsLoading(false); setCurrentStep(''); }
    };

    const handleClassifyData = async () => {
        if (!schema) return;
        setIsLoading(true); setCurrentStep('Classifying...'); setError(null);
        try {
            const res = await postClassifyData(schema);
            setClassifications(res.classification_results);
        } catch (err: any) { setError(err.message || 'Classification failed.'); }
        finally { setIsLoading(false); setCurrentStep(''); }
    };

    const handleGenerateSql = async () => {
        if (!classifications) return;
        setIsLoading(true); setCurrentStep('Generating...'); setError(null);
        try {
            const res = await postGenerateMaskingSQL(classifications);
            setSqlStatements(res.sql_statements);
        } catch (err: any) { setError(err.message || 'SQL Generation failed.'); }
        finally { setIsLoading(false); setCurrentStep(''); }
    };

    const handleApplyPlan = async () => {
        if (!sqlStatements) return;
        setIsLoading(true); setCurrentStep('Applying...'); setError(null);
        setGovernedViews(null); setViewData(null); setSelectedView(null);
        try {
            const res = await postApplyMaskingPlan(connectionString, sqlStatements);
            setFinalMessage(res.message);
            setSqlStatements(null);
        } catch (err: any) { setError(err.message || 'Failed to apply plan.'); }
        finally { setIsLoading(false); setCurrentStep(''); }
    };

    const handleListGovernedViews = async () => {
        setIsLoading(true); setCurrentStep('Listing Views...'); setError(null);
        setViewData(null); setSelectedView(null);
        try {
            const res = await postListGovernedViews(connectionString);
            setGovernedViews(res.governed_views);
        } catch (err: any) { setError(err.message || 'Failed to list views.'); }
        finally { setIsLoading(false); setCurrentStep(''); }
    };

    const handleFetchViewData = async (viewName: string) => {
        if (!viewingRole) {
            setError("Please specify a role to view data as.");
            return;
        }
        setIsLoading(true); setCurrentStep(`Fetching ${viewName}...`); setError(null);
        setSelectedView(viewName);
        try {
            const res = await postFetchViewData(connectionString, viewName, viewingRole);
            setViewData(res);
        } catch (err: any) { setError(err.message || 'Failed to fetch view data.'); }
        finally { setIsLoading(false); setCurrentStep(''); }
    };

    return (
        <div className={`min-h-[calc(100vh-80px)] w-full flex items-center p-8 transition-all duration-700 ease-in-out ${viewMode === 'initial' ? 'justify-center' : 'justify-start'}`}>
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-start">

                <div className="md:col-span-1">
                    <div className="card-border rounded-2xl overflow-hidden animate-vertical-float">
                        <div className="p-6 border-b border-indigo-500/20">
                            <h2 className="text-xl font-semibold text-white">Automated Data Governance Agent</h2>
                            <p className="text-sm text-slate-400 mt-1">Step 1: Analyze Database</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label htmlFor="connStr" className="text-sm font-medium text-slate-300 block mb-2">Database Connection String</label>
                                <input id="connStr" type="password" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="postgresql://..."
                                    className="w-full px-4 py-2 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition" disabled={isLoading} />
                            </div>
                            <button onClick={handleRunAnalysis} disabled={isLoading}
                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition disabled:bg-slate-700 flex items-center justify-center gap-2">
                                {isLoading && currentStep === 'Analyzing...' ? <LoaderCircle className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                                {isLoading && currentStep === 'Analyzing...' ? 'Analyzing...' : 'Run Analysis'}
                            </button>
                            {error && viewMode === 'initial' && (
                                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in">
                                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {viewMode === 'results' && (
                    <div className="md:col-span-3">
                        <div className="card-border rounded-2xl overflow-hidden animate-fade-in">
                            <div className="p-6">
                                <h2 className="text-xl font-semibold text-white mb-4">Analysis & Action Plan</h2>
                                {error && (
                                    <div className="flex items-center gap-3 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {schema && <SchemaDisplay schema={schema} />}
                                    {integrityReport && <IntegrityReport data={integrityReport} />}
                                    {classifications && <ClassificationDisplay classifications={classifications} />}
                                    {sqlStatements && <SqlDisplay statements={sqlStatements} />}
                                    {finalMessage && !governedViews && <div className="p-4 bg-green-500/20 rounded-lg text-center text-green-300 animate-fade-in">{finalMessage}</div>}

                                    {governedViews && (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <UserCircle className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={viewingRole}
                                                    onChange={(e) => setViewingRole(e.target.value)}
                                                    placeholder="e.g., admin, analyst"
                                                    className="w-full pl-10 pr-4 py-2 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            <GovernedViewList views={governedViews} onSelectView={handleFetchViewData} isLoading={isLoading} selectedView={selectedView} />
                                        </div>
                                    )}
                                    {viewData && <ViewDataDisplay viewData={viewData} />}

                                    {/* Action Buttons */}
                                    <div className="pt-4 text-center space-y-4">

                                        {/* Step 2: Show "Classify" button. Appears after analysis. Disappears after classification. */}
                                        {schema && !classifications && (
                                            <button onClick={handleClassifyData} disabled={isLoading} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-700 animate-fade-in">
                                                {isLoading && currentStep === 'Classifying...' ? <LoaderCircle className="animate-spin" /> : <ShieldCheck />}
                                                {isLoading && currentStep === 'Classifying...' ? 'Classifying...' : 'Proceed to Classify Data'}
                                            </button>
                                        )}

                                        {/* Step 3: Show "Generate SQL" button. Appears after classification. Disappears after SQL generation OR after the plan is applied. */}
                                        {/* THE FIX IS HERE: We add `&& !finalMessage` to the condition. */}
                                        {classifications && !sqlStatements && !finalMessage && (
                                            <button onClick={handleGenerateSql} disabled={isLoading} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-700 animate-fade-in">
                                                {isLoading && currentStep === 'Generating...' ? <LoaderCircle className="animate-spin" /> : <FileText />}
                                                {isLoading && currentStep === 'Generating...' ? 'Generating...' : 'Generate SQL Masking Plan'}
                                            </button>
                                        )}

                                        {/* Step 4: Show "Apply Plan" button. Appears ONLY when SQL is ready to be applied. */}
                                        {sqlStatements && (
                                            <button onClick={handleApplyPlan} disabled={isLoading} className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-700 animate-fade-in">
                                                {isLoading && currentStep === 'Applying...' ? <LoaderCircle className="animate-spin" /> : <CheckCircle />}
                                                {isLoading && currentStep === 'Applying...' ? 'Applying...' : 'Approve and Apply Plan'}
                                            </button>
                                        )}

                                        {/* Step 5: Show "View Results" button. Appears ONLY after the plan has been successfully applied. */}
                                        {finalMessage && (
                                            <button onClick={handleListGovernedViews} disabled={isLoading} className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:bg-slate-700 animate-fade-in">
                                                {isLoading && currentStep === 'Listing Views...' ? <LoaderCircle className="animate-spin" /> : <Eye />}
                                                {isLoading ? 'Loading...' : (governedViews ? 'Refresh Governed Views' : 'View Governance Results')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIAgentPage;