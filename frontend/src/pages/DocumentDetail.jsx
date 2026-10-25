import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: '' });

  const loadDocument = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDocument(id);
      setDocument(data);
      setFormData({ name: data.name, category: data.category || '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  async function handleDownload() {
    try {
      const res = await api.downloadDocument(id);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    
    setDeleting(true);
    try {
      await api.deleteDocument(id);
      navigate('/documents');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateDocument(id, formData);
      setEditMode(false);
      loadDocument();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div style={{ textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div className="alert alert-error">{error}</div>
        <Link to="/documents" className="btn btn-primary">Back to Documents</Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      {error && <div className="alert alert-error" style={{ maxWidth: '800px', margin: '0 auto 1rem' }}>{error}</div>}

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{document.name}</h1>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Category: {document.category || 'Uncategorized'} | 
              Owner: {document.owner_name} ({document.owner_email}) |
              Size: {formatFileSize(document.file_size)} |
              Updated: {new Date(document.updated_at).toLocaleString()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleDownload} className="btn btn-primary" disabled={!document.canRead}>
              Download
            </button>
            {document.canEdit && (
              <>
                <button onClick={() => setEditMode(!editMode)} className="btn btn-secondary">
                  {editMode ? 'Cancel' : 'Edit'}
                </button>
                <Link to={`/documents/${id}/permissions`} className="btn btn-secondary">Permissions</Link>
                <button onClick={handleDelete} className="btn btn-danger btn-sm" disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>

        {editMode ? (
          <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-input"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="Enter category"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditMode(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <div style={{ padding: '1rem 0' }}>
            <p style={{ color: '#6b7280' }}>
              <strong>File:</strong> {document.file_name} ({document.mime_type})
            </p>
            <p style={{ color: '#6b7280' }}>
              <strong>Uploaded:</strong> {new Date(document.created_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentDetail;