const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  // Documents
  uploadDocument: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }).then(res => res.json());
  },

  listDocuments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/documents${query ? `?${query}` : ''}`);
  },

  getDocument: (id) => request(`/documents/${id}`),

  downloadDocument: (id) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_URL}/documents/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  updateDocument: (id, data) => request(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  getCategories: () => request('/documents/categories'),

  // Permissions
  listUsers: () => request('/permissions/users'),

  listPermissions: (documentId) => request(`/permissions/${documentId}`),

  grantPermission: (documentId, userId, permission) => request(`/permissions/${documentId}`, {
    method: 'POST',
    body: JSON.stringify({ targetUserId: userId, permission })
  }),

  revokePermission: (documentId, userId) => request(`/permissions/${documentId}/${userId}`, {
    method: 'DELETE'
  }),

  // Audit
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit${query ? `?${query}` : ''}`);
  }
};