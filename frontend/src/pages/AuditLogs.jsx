import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [filters, setFilters] = useState({
    userId: '',
    documentId: '',
    action: '',
    result: '',
    startDate: '',
    endDate: ''
  });

  const actions = ['UPLOAD', 'VIEW', 'DOWNLOAD', 'EDIT', 'DELETE', 'GRANT_PERMISSION', 'REVOKE_PERMISSION', 'LOGIN', 'LIST_PERMISSIONS', 'DENIED_ACCESS'];

  useEffect(() => {
    loadLogs();
  }, [page, filters]);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        page,
        limit,
        ...filters
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Load audit logs error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function getResultBadgeClass(result) {
    return result === 'SUCCESS' ? 'badge-success' : 'badge-denied';
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <div className="page-header">
        <h1 className="page-title">Audit Logs</h1>
      </div>

      <div className="card">
        <form>
          <div className="search-filters">
            <div className="form-group" style={{ minWidth: '200px' }}>
              <label className="form-label">Action</label>
              <select
                className="form-input"
                value={filters.action}
                onChange={e => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                {actions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: '150px' }}>
              <label className="form-label">Result</label>
              <select
                className="form-input"
                value={filters.result}
                onChange={e => handleFilterChange('result', e.target.value)}
              >
                <option value="">All Results</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="DENIED">DENIED</option>
              </select>
            </div>
            <div className="form-group" style={{ minWidth: '180px' }}>
              <label className="form-label">From Date</label>
              <input
                type="datetime-local"
                className="form-input"
                value={filters.startDate}
                onChange={e => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ minWidth: '180px' }}>
              <label className="form-label">To Date</label>
              <input
                type="datetime-local"
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
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No audit logs found.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Document</th>
                    <th>Target User</th>
                    <th>Result</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>
                        {log.user_name ? (
                          <>
                            {log.user_name}
                            <br />
                            <small style={{ color: '#6b7280' }}>{log.user_email}</small>
                          </>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>System</span>
                        )}
                      </td>
                      <td><code style={{ fontSize: '0.75rem' }}>{log.action}</code></td>
                      <td>{log.document_name || (log.document_id ? log.document_id.substring(0, 8) + '...' : '-')}</td>
                      <td>{log.target_user_name || (log.target_user_id ? log.target_user_id.substring(0, 8) + '...' : '-')}</td>
                      <td><span className={`badge ${getResultBadgeClass(log.result)}`}>{log.result}</span></td>
                      <td style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
                  Page {page} of {totalPages} ({total} total)
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

export default AuditLogs;