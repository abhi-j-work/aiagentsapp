import { useState, useEffect, useRef } from 'react'; // MODIFICATION: Added useRef
import { useLocation, Link } from 'react-router-dom';
import {
    LoaderCircle, AlertTriangle, CheckCircle, Download, Eye, Table, UserCircle, FileText
} from 'lucide-react';
import {
    postExtractSchema, postExplainIntegrity, postClassifyData, postGenerateMaskingSQL, postApplyMaskingPlan,
    postListGovernedViews, postFetchViewData,
    downloadWordReport,
    type ExtractedSchema, type ReferentialIntegrityResponse, type ClassificationResult,
    type SQLGenerationResponse, type FetchViewDataResponse
} from '../services/api';
// Assuming the path to your chart component is correct
import ClassificationSummaryChart from '../components/ClassificationSummaryChart'; 

// ===================================================
// SUB-COMPONENTS (Unchanged)
// ===================================================
const GovernedViewList = ({ views, onSelectView, isLoading, selectedView }: { views: string[], onSelectView: (viewName: string) => void, isLoading: boolean, selectedView: string | null }) => (
    <div className="animate-fade-in mt-4">
        <h4 className="font-semibold text-white flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-indigo-400" />Governed Views</h4>
        <div className="space-y-2 bg-slate-800/60 rounded-md p-3">
            {views.map(viewName => (
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
    if (!viewData.data || viewData.data.length === 0) return <div className="text-center text-slate-300 p-4 mt-4 animate-fade-in">No data to display for this view.</div>;
    const headers = Object.keys(viewData.data[0]);
    return (
        <div className="animate-fade-in mt-4">
            <h5 className="font-semibold text-white mb-3">Data from: <span className="text-indigo-400">{viewData.view_name}</span></h5>
            <div className="max-h-80 overflow-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800 sticky top-0 z-10">
                        <tr>{headers.map(h => <th key={h} className="p-3 font-medium text-slate-200">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {viewData.data.map((row, i) => (
                            <tr key={i} className="bg-slate-900/70 hover:bg-slate-800">
                                {headers.map(h => <td key={`${i}-${h}`} className="p-3 text-slate-300 whitespace-nowrap">{String(row[h])}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DownloadActions = ({ integrityData, sqlData }: { integrityData: ReferentialIntegrityResponse; sqlData: SQLGenerationResponse; }) => {
    const handleDownloadWord = () => {
        const reportData = { referential_integrity: integrityData, masking_sql: sqlData };
        downloadWordReport(reportData);
    };

    return (
        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <span className="text-slate-200 font-semibold">Governance Report Complete</span>
                <div className="h-6 w-px bg-slate-600 hidden sm:block"></div>
                <span className="text-slate-300">Download Report As:</span>
                <button onClick={handleDownloadWord} className="group bg-blue-600 text-white hover:bg-blue-500 transition-all flex items-center text-sm font-semibold px-4 py-2 rounded-lg shadow-lg">
                    <Download className="w-4 h-4 mr-2" /> Word
                </button>
            </div>
        </div>
    );
};

// ===================================================
// MAIN PAGE COMPONENT
// ===================================================
const AutoRunPage = () => {
    const location = useLocation();
    const connectionString = location.state?.connectionString || '';

    // State remains the same
    const [isLoading, setIsLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const [isComplete, setIsComplete] = useState(false);
    const [downloadableIntegrityData, setDownloadableIntegrityData] = useState<ReferentialIntegrityResponse | null>(null);
    const [downloadableSqlData, setDownloadableSqlData] = useState<SQLGenerationResponse | null>(null);
    const [classificationResults, setClassificationResults] = useState<ClassificationResult[] | null>(null);
    const [isFetchingViews, setIsFetchingViews] = useState(false);
    const [governedViews, setGovernedViews] = useState<string[] | null>(null);
    const [selectedView, setSelectedView] = useState<string | null>(null);
    const [viewData, setViewData] = useState<FetchViewDataResponse | null>(null);
    const [viewingRole, setViewingRole] = useState<string>('admin');

    // MODIFICATION: Add a ref to track if the effect has already run
    const effectRan = useRef(false);

    // --- API Handlers ---
    useEffect(() => {
        if (!connectionString) {
            setError("No database connection string provided. Please return to the previous page.");
            setIsLoading(false);
            return;
        }
        
        // MODIFICATION: Check if the effect has already run
        if (effectRan.current === true) {
            return;
        }

        const controller = new AbortController();
        const signal = controller.signal;

        const runAllSteps = async () => {
            try {
                // Step 1: Extract Schema and Integrity
                setCurrentStep('Step 1/5: Extracting schema and integrity...');
                const [schemaResponse, integrityResponse] = await Promise.all([
                    postExtractSchema(connectionString, signal),
                    postExplainIntegrity(connectionString, signal)
                ]);
                const schema: ExtractedSchema = schemaResponse.schema_data;
                if (!schema?.tables) throw new Error("Failed to extract a valid schema.");
                setDownloadableIntegrityData(integrityResponse);

                // Step 2: Classify Data
                setCurrentStep('Step 2/5: Classifying sensitive data...');
                const classResponse = await postClassifyData(schema, signal);
                const classifications: ClassificationResult[] = classResponse.classification_results;
                if (!classifications) throw new Error("Classification step failed to return valid results.");
                setClassificationResults(classifications);

                // Step 3: Generate SQL
                setCurrentStep('Step 3/5: Generating SQL masking plan...');
                const sqlResponse = await postGenerateMaskingSQL(classifications, signal);
                if (!sqlResponse?.sql_statements) throw new Error("SQL generation failed.");
                setDownloadableSqlData(sqlResponse);

                // Step 4: Apply Plan
                setCurrentStep('Step 4/5: Applying masking plan...');
                await postApplyMaskingPlan(connectionString, sqlResponse.sql_statements, signal);

                // Step 5: List Governed Views
                setCurrentStep('Step 5/5: Fetching governed views...');
                const viewsResponse = await postListGovernedViews(connectionString, signal);
                setGovernedViews(viewsResponse.governed_views);

                setCurrentStep('All steps completed successfully!');
                setIsComplete(true);
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    console.log('API call was aborted.');
                    return; 
                }
                setError(err.message || 'An unexpected error occurred during the automated run.');
            } finally {
                setIsLoading(false);
            }
        };

        runAllSteps();

        // MODIFICATION: Mark the effect as run and set up cleanup
        effectRan.current = true;
        return () => {
            controller.abort();
        };

    }, [connectionString]); // The dependency array is correct.

    const handleFetchViewData = async (viewName: string) => {
        if (!viewingRole) { setError("Please specify a role to view data as."); return; }
        setIsFetchingViews(true);
        setSelectedView(viewName);
        setViewData(null);
        try {
            const res = await postFetchViewData(connectionString, viewName, viewingRole);
            setViewData(res);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch view data.');
        } finally {
            setIsFetchingViews(false);
        }
    };
    
    // The JSX part of the component remains entirely unchanged.
    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-8">
            <div className="w-full max-w-4xl mx-auto">
                <div className="card-border rounded-2xl p-8">
                    <h2 className="text-2xl font-semibold text-white text-center mb-6">Automated Governance Run</h2>

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <LoaderCircle className="w-12 h-12 text-indigo-400 animate-spin" />
                            <p className="text-slate-300 text-lg font-medium">{currentStep}</p>
                            <p className="text-slate-400 text-sm">Please wait, this may take a few moments...</p>
                        </div>
                    )}

                    {error && !isComplete && (
                        <div className="flex flex-col items-center text-center gap-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 animate-fade-in">
                            <AlertTriangle className="w-10 h-10" />
                            <p className="font-semibold text-lg">An Error Occurred</p>
                            <p className="text-sm">{error}</p>
                            <Link to="/" className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition">Go Back</Link>
                        </div>
                    )}

                    {isComplete && (
                        <div className="text-center animate-fade-in">
                            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-white">Process Complete!</h3>
                            <p className="text-slate-300 mt-2">The automated process has finished. You can now download the report or view the governed data below.</p>
                            
                            {classificationResults && (
                                <ClassificationSummaryChart results={classificationResults} />
                            )}
                            
                            {downloadableIntegrityData && downloadableSqlData && (
                                <DownloadActions integrityData={downloadableIntegrityData} sqlData={downloadableSqlData} />
                            )}

                            <div className="mt-8 text-left">
                                <div className="h-px bg-slate-700 w-full mb-8"></div>
                                {error && <div className="flex items-center gap-3 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><span>{error}</span></div>}
                                {governedViews && governedViews.length > 0 ? (
                                    <>
                                        <div className="relative mb-4">
                                            <label htmlFor="roleInput" className="block text-sm font-medium text-slate-300 mb-2">View Data as Role:</label>
                                            <UserCircle className="w-5 h-5 absolute left-3 top-10 -translate-y-1/2 text-slate-400" />
                                            <input
                                                id="roleInput"
                                                type="text"
                                                value={viewingRole}
                                                onChange={(e) => setViewingRole(e.target.value)}
                                                placeholder="e.g., admin, analyst"
                                                className="w-full pl-10 pr-4 py-2 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition"
                                                disabled={isFetchingViews}
                                            />
                                        </div>
                                        <GovernedViewList
                                            views={governedViews}
                                            onSelectView={handleFetchViewData}
                                            isLoading={isFetchingViews}
                                            selectedView={selectedView}
                                        />
                                    </>
                                ) : (
                                    <p className="text-center text-slate-400">No governed views were generated or found.</p>
                                )}
                                {viewData && <ViewDataDisplay viewData={viewData} />}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AutoRunPage;