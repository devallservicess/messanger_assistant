import { useEffect } from 'react';

function DataTable({ dataSources, onDelete, loading, onRefresh }) {
    useEffect(() => {
        onRefresh?.();
    }, []);

    if (dataSources.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No Data Sources Yet</h3>
                <p>Upload CSV, JSON, or TXT files to add store data to the RAG system.</p>
                <button className="btn-primary" onClick={onRefresh}>
                    🔄 Refresh
                </button>
            </div>
        );
    }

    return (
        <div className="data-table-container">
            <div className="table-header">
                <h3>📊 Uploaded Data Sources</h3>
                <button className="btn-secondary" onClick={onRefresh} disabled={loading}>
                    🔄 Refresh
                </button>
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>File Name</th>
                            <th>Chunks</th>
                            <th>Uploaded</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dataSources.map((source) => (
                            <tr key={source.id}>
                                <td className="file-name">
                                    <span className="file-icon">
                                        {source.name.endsWith('.csv') ? '📊' :
                                            source.name.endsWith('.json') ? '📋' : '📄'}
                                    </span>
                                    {source.name}
                                </td>
                                <td>
                                    <span className="chunk-badge">{source.chunks}</span>
                                </td>
                                <td className="date">
                                    {new Date(source.uploadedAt).toLocaleString()}
                                </td>
                                <td>
                                    <button
                                        className="btn-delete"
                                        onClick={() => onDelete(source.id)}
                                        disabled={loading}
                                    >
                                        🗑️ Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DataTable;
