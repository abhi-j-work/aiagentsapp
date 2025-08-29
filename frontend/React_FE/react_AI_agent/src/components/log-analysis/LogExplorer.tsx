import React, { useState } from 'react';
import { getRawLogs, type LogEntry } from '../../services/api';
import './LogExplorer.css';

export const LogExplorer: React.FC = () => {
    const [query, setQuery] = useState('{job="python_app"}');
    const [since, setSince] = useState('15m');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getRawLogs(query, since);
            setLogs(result.logs);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch logs.');
            setLogs([]);
        } finally {
            setIsLoading(false);
        }
    };

    const getLogLevelClass = (line: string): string => {
        if (line.includes('ERROR')) return 'log-level-ERROR';
        if (line.includes('WARNING')) return 'log-level-WARNING';
        return '';
    };

    return (
        <div className="log-explorer">
            <div className="search-bar">
                <input 
                    type="text" 
                    value={query} 
                    onChange={e => setQuery(e.target.value)} 
                    placeholder="Enter LogQL query..."
                />
                <select value={since} onChange={e => setSince(e.target.value)}>
                    <option value="5m">Last 5 minutes</option>
                    <option value="15m">Last 15 minutes</option>
                    <option value="1h">Last 1 hour</option>
                    <option value="6h">Last 6 hours</option>
                </select>
                <button onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="log-table-container">
                {isLoading && <div className="status-message">Loading...</div>}
                {!isLoading && logs.length === 0 && <div className="status-message">No logs found for this query.</div>}
                {logs.length > 0 && (
                    <table className="log-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Log Line</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.nanos}>
                                    <td className="log-ts">{new Date(log.ts).toLocaleString()}</td>
                                    <td className={`log-line ${getLogLevelClass(log.line)}`}>
                                        <code>{log.line}</code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};