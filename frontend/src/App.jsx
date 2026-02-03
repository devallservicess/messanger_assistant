import { useState, useCallback } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import DataTable from './components/DataTable';
import SearchTest from './components/SearchTest';

const API_BASE = 'http://localhost:3000/api';

function App() {
  const [dataSources, setDataSources] = useState([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const fetchDataSources = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/data`);
      const data = await res.json();
      if (data.success) {
        setDataSources(data.data);
        setTotalDocuments(data.totalDocuments);
      }
    } catch (err) {
      console.error('Failed to fetch data sources:', err);
    }
  }, []);

  const handleUploadSuccess = (source) => {
    setDataSources(prev => [...prev, source]);
    fetchDataSources();
  };

  const handleDelete = async (sourceId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/data/${sourceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDataSources(prev => prev.filter(s => s.id !== sourceId));
        fetchDataSources();
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🏪</span>
            <h1>Jasper's Market</h1>
          </div>
          <p className="subtitle">RAG Data Management System</p>
        </div>
      </header>

      <main className="main">
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-value">{dataSources.length}</span>
            <span className="stat-label">Data Sources</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalDocuments}</span>
            <span className="stat-label">Total Documents</span>
          </div>
        </div>

        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 Upload Data
          </button>
          <button
            className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => { setActiveTab('manage'); fetchDataSources(); }}
          >
            📊 Manage Data
          </button>
          <button
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Test Search
          </button>
        </nav>

        <div className="tab-content">
          {activeTab === 'upload' && (
            <FileUpload
              apiBase={API_BASE}
              onSuccess={handleUploadSuccess}
            />
          )}
          {activeTab === 'manage' && (
            <DataTable
              dataSources={dataSources}
              onDelete={handleDelete}
              loading={loading}
              onRefresh={fetchDataSources}
            />
          )}
          {activeTab === 'search' && (
            <SearchTest apiBase={API_BASE} />
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Powered by RAG Technology • Jasper's Market WhatsApp Bot</p>
      </footer>
    </div>
  );
}

export default App;
