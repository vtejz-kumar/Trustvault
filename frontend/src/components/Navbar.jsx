import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/documents', label: 'Documents' },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ path: '/audit', label: 'Audit Logs' });
  }

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link to="/dashboard" className="navbar-brand">TrustVault</Link>
        <div className="navbar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`btn btn-sm ${location.pathname === item.path ? 'btn-primary' : 'btn-secondary'}`}
            >
              {item.label}
            </Link>
          ))}
          <span style={{ marginRight: '1rem', color: '#6b7280' }}>
            {user?.name} (<span className={`badge badge-${user?.role.toLowerCase()}`}>{user?.role}</span>)
          </span>
          <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;