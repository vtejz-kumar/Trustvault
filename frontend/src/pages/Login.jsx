import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f9fafb' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#2563eb' }}>TrustVault</h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '2rem' }}>Secure Document Management</p>
        
        {error && <div className="alert alert-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '6px', fontSize: '0.875rem' }}>
          <strong>Demo Accounts:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', lineHeight: '1.8' }}>
            <li>admin@trustvault.com / admin123</li>
            <li>owner@trustvault.com / owner123</li>
            <li>viewer@trustvault.com / viewer123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;