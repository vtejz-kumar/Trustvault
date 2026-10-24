import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, owned: 0, shared: 0 });
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [docsRes] = await Promise.all([
        api.listDocuments({ limit: 5, page: 1 })
      ]);
      
      const docs = docsRes.documents || [];
      setRecentDocs(docs);
      setStats({
        total: docsRes.total || 0,
        owned: docs.filter(d => d.owner_id === user.id).length,
        shared: docs.filter(d => d.owner_id !== user.id).length
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <Link to="/documents" className="btn btn-primary">View All Documents</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2563eb' }}>{stats.total}</div>
          <div style={{ color: '#6b7280' }}>Total Documents</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669' }}>{stats.owned}</div>
          <div style={{ color: '#6b7280' }}>Owned</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#7c3aed' }}>{stats.shared}</div>
          <div style={{ color: '#6b7280' }}>Shared With Me</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Recent Documents</h2>
        {loading ? (
          <div>Loading...</div>
        ) : recentDocs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <p>No documents yet. <Link to="/documents">Upload your first document</Link>.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentDocs.map(doc => (
                <tr key={doc.id}>
                  <td>{doc.name}</td>
                  <td>{doc.category || '-'}</td>
                  <td>{doc.owner_name}</td>
                  <td>{new Date(doc.updated_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/documents/${doc.id}`} className="btn btn-sm btn-primary">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;