import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    ownerId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadCategories();
    loadDocuments();
  }, [page, filters]);

  async function loadCategories() {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Load categories error:', err);
    }
  }

  async function loadDocuments() {
    setLoading(true);
    try {
      const data = await api.listDocuments({
        page,
        limit,
        ...filters
      });
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Load documents error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadDocuments();
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Documents</h1>
        <Link to="/documents/upload" className="btn btn-primary">Upload Document</Link>
      </div>

      <div className="card">
        <form onSubmit={handleSearch}>
          <div className="search-filters">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={filters.category}
                onChange={e => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-input"
                value={filters.startDate}
                onChange={e => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-input"
                value={filters.endDate}
                onChange={e => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <p>No documents found matching your criteria.</p>
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Owner</th>
                  <th>Size</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <Link to={`/documents/${doc.id}`} style={{ fontWeight: 500 }}>
                        {doc.name}
                      </Link>
                    </td>
                    <td>{doc.category || '-'}</td>
                    <td>{doc.owner_name}</td>
                    <td>{formatFileSize(doc.file_size)}</td>
                    <td>{new Date(doc.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to={`/documents/${doc.id}`} className="btn btn-sm btn-primary">View</Link>
                        {doc.canEdit && (
                          <Link to={`/documents/${doc.id}/permissions`} className="btn btn-sm btn-secondary">Permissions</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Documents;