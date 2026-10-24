import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

function Permissions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [formData, setFormData] = useState({ targetUserId: '', permission: 'READ' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [perms, userList] = await Promise.all([
        api.listPermissions(id),
        api.listUsers()
      ]);
      setPermissions(perms);
      setUsers(userList.filter(u => u.role !== 'ADMIN'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGrant(e) {
    e.preventDefault();
    if (!formData.targetUserId || !formData.permission) return;
    
    setGranting(true);
    setError('');
    setSuccess('');
    
    try {
      await api.grantPermission(id, formData.targetUserId, formData.permission);
      setSuccess('Permission granted successfully');
      setFormData({ targetUserId: '', permission: 'READ' });
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(userId) {
    if (!window.confirm('Revoke this user\'s access to this document?')) return;
    
    setError('');
    setSuccess('');
    
    try {
      await api.revokePermission(id, userId);
      setSuccess('Permission revoked successfully');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  const currentPermissions = new Set(permissions.map(p => p.user_id));
  const availableUsers = users.filter(u => !currentPermissions.has(u.id));

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem', maxWidth: '800px' }}>
      <div className="page-header">
        <Link to={`/documents/${id}`} className="btn btn-secondary">← Back to Document</Link>
        <h1 className="page-title">Manage Permissions</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Grant Permission</h2>
        <form onSubmit={handleGrant}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">User</label>
              <select
                className="form-input"
                value={formData.targetUserId}
                onChange={e => setFormData(prev => ({ ...prev, targetUserId: e.target.value }))}
                disabled={availableUsers.length === 0}
              >
                <option value="">Select user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email}) - {user.role}
                  </option>
                ))}
                {availableUsers.length === 0 && <option value="" disabled>All users already have access</option>}
              </select>
            </div>
            <div className="form-group" style={{ minWidth: '150px' }}>
              <label className="form-label">Permission</label>
              <select
                className="form-input"
                value={formData.permission}
                onChange={e => setFormData(prev => ({ ...prev, permission: e.target.value }))}
              >
                <option value="READ">READ</option>
                <option value="EDIT">EDIT</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={granting || availableUsers.length === 0}>
              {granting ? 'Granting...' : 'Grant Permission'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem' }}>Current Permissions</h2>
        {loading ? (
          <div>Loading...</div>
        ) : permissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔐</div>
            <p>No permissions granted yet.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Permission</th>
                <th>Granted By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {permissions.map(perm => (
                <tr key={perm.id}>
                  <td>{perm.name} ({perm.email})</td>
                  <td><span className={`badge badge-${perm.role.toLowerCase()}`}>{perm.role}</span></td>
                  <td><span className={`badge badge-${perm.permission.toLowerCase()}`}>{perm.permission}</span></td>
                  <td>{perm.granted_by_name || perm.granted_by}</td>
                  <td>
                    <button
                      onClick={() => handleRevoke(perm.user_id)}
                      className="btn btn-danger btn-sm"
                    >
                      Revoke
                    </button>
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

export default Permissions;