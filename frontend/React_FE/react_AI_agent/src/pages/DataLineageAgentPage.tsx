import React, { useState } from 'react';
import {
    LoaderCircle, AlertTriangle, Table, Eye, Workflow, Search, Network, KeyRound
} from 'lucide-react';
import { postListDatabaseObjects, postGetDataLineage } from '../services/api';
import type { LineageResponse, DatabaseObjectsResponse, TableInfo } from '../services/api';
import LineageDisplay from '../components/LineageDisplay';

// This sub-component is correctly defined outside the main component for performance.
const ObjectSelector = ({
    objects,
    title,
    objectType,
    onSelect,
    selectedObject,
    icon: Icon
}: {
    objects: TableInfo[] | string[],
    title: string,
    objectType: 'table' | 'view',
    onSelect: (name: string, type: 'table' | 'view') => void,
    selectedObject: string | null,
    icon: React.ElementType
}) => (
    <div>
        <h3 className="font-semibold text-slate-300 flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-indigo-400" /> {title}
        </h3>
        <div className="space-y-1.5">
            {objects.map(obj => {
                const name = typeof obj === 'string' ? obj : obj.name;
                const pk = typeof obj !== 'string' ? obj.primary_key : null;

                return (
                    <button
                        key={name}
                        onClick={() => onSelect(name, objectType)}
                        className={`w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors flex items-center justify-between gap-2 ${selectedObject === name ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'}`}
                    >
                        <span className="truncate" title={name}>{name}</span>
                        {pk && (
                            <span className="flex-shrink-0 flex items-center gap-1 text-amber-400" title={`Primary Key: ${pk}`}>
                                <KeyRound className="w-3.5 h-3.5" />
                                <span className="text-xs font-mono">{pk}</span>
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    </div>
);


const DataLineageAgentPage = () => {
    // UI State
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLineageLoading, setIsLineageLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connectionString, setConnectionString] = useState('');
    
    // Data State
    const [dbObjects, setDbObjects] = useState<DatabaseObjectsResponse | null>(null);
    const [selectedObject, setSelectedObject] = useState<{ label: string; id: string; } | null>(null);
    const [lineageData, setLineageData] = useState<LineageResponse | null>(null);

    const handleListObjects = async () => {
        if (!connectionString) { setError("Please provide a database connection string."); return; }
        setIsConnecting(true);
        setError(null);
        setDbObjects(null);
        setLineageData(null);
        setSelectedObject(null);

        try {
            const res = await postListDatabaseObjects(connectionString);
            setDbObjects(res);
        } catch (err: any) {
            setError(err.message || 'Failed to connect and list objects.');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleSelectObject = async (objectName: string, objectType: 'table' | 'view') => {
        const nodeId = `${objectType}_${objectName}`;
        setSelectedObject({ label: objectName, id: nodeId });
        
        setIsLineageLoading(true);
        setLineageData(null);
        setError(null);
        
        try {
            const res = await postGetDataLineage(connectionString, objectName);
            setLineageData(res);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch lineage data.');
        } finally {
            setIsLineageLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-900 text-white flex p-4 lg:p-6 gap-6">
            <aside className="w-full max-w-xs flex-shrink-0 flex flex-col gap-6">
                <div className="flex-shrink-0">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Network className="w-7 h-7 text-indigo-400"/>
                        Data Lineage Agent
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Select an object to visualize its dependencies.</p>
                </div>

                <div className="card-border p-4 rounded-xl space-y-4 bg-slate-800/30">
                     <div>
                        <label htmlFor="connStr" className="text-sm font-medium text-slate-300 block mb-2">Database Connection</label>
                        <input id="connStr" type="password" value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="postgresql://..." className="w-full px-4 py-2 glass rounded-lg border border-white/20 text-white focus:border-indigo-400 focus:outline-none transition" disabled={isConnecting} />
                    </div>
                    <button onClick={handleListObjects} disabled={isConnecting || !connectionString} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition disabled:bg-slate-700 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isConnecting ? (<><LoaderCircle className="w-5 h-5 animate-spin" />Connecting...</>) : (<><Search className="w-5 h-5" />List Objects</>)}
                    </button>
                </div>
                
                {error && (
                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-fade-in">
                        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                
                {dbObjects && (
                    <div className="flex-grow card-border p-4 rounded-xl bg-slate-800/30 overflow-y-auto space-y-4 animate-fade-in">
                        <ObjectSelector 
                            objects={dbObjects.tables}
                            title="Tables" 
                            objectType="table"
                            onSelect={handleSelectObject}
                            selectedObject={selectedObject?.label || null} 
                            icon={Table} 
                        />
                        <ObjectSelector 
                            objects={dbObjects.views}
                            title="Views" 
                            objectType="view"
                            onSelect={handleSelectObject}
                            selectedObject={selectedObject?.label || null} 
                            icon={Eye} 
                        />
                    </div>
                )}
            </aside>
            
            <main className="flex-grow card-border rounded-xl bg-slate-800/30 flex items-center justify-center p-2">
                {isLineageLoading ? (
                    <div className="flex flex-col items-center gap-4 text-slate-400 animate-fade-in">
                        <LoaderCircle className="w-10 h-10 animate-spin text-indigo-400" />
                        <span>Building Lineage Graph...</span>
                    </div>
                ) : lineageData && selectedObject ? (
                    // This is now simpler and correct. It no longer passes the unnecessary tablesInfo prop.
                    <LineageDisplay 
                        data={lineageData} 
                        centralNodeId={selectedObject.id} 
                    />
                ) : (
                    <div className="text-center text-slate-400">
                        <Workflow className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                        <h2 className="text-xl font-semibold text-slate-300">Welcome to the Lineage Agent</h2>
                        <p className="mt-2 max-w-md">Connect to your database and select a table or view from the sidebar to visualize its data flow.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DataLineageAgentPage;