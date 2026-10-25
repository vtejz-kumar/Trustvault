import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

function Upload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const MAX_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/gif'
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Load categories error:', err);
    }
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (selectedFile.size > MAX_SIZE) {
      setError('File size exceeds 10MB limit');
      return;
    }
    
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('File type not allowed. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, GIF');
      return;
    }
    
    setFile(selectedFile);
    if (!name) setName(selectedFile.name);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('category', category);
      
      const document = await api.uploadDocument(formData);
      setSuccess('Document uploaded successfully!');
      setFile(null);
      setName('');
      setCategory('');
      
      setTimeout(() => navigate(`/documents/${document.id}`), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem', maxWidth: '600px' }}>
      <div className="page-header">
        <Link to="/documents" className="btn btn-secondary">← Back</Link>
        <h1 className="page-title">Upload Document</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">File</label>
            <input
              type="file"
              className="form-input"
              onChange={handleFileChange}
              required
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
            />
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Max 10MB. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, GIF
            </div>
            {file && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                <strong>{file.name}</strong> ({formatFileSize(file.size)}, {file.type})
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">Document Name</label>
            <input
              type="text"
              id="name"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Enter document name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="category">Category</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                id="category"
                className="form-input"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Select or create category...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="text"
                className="form-input"
                placeholder="New category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ maxWidth: '150px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Upload Document'}
            </button>
            <Link to="/documents" className="btn btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Upload;