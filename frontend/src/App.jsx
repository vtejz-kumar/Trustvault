import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Upload from './pages/Upload';
import DocumentDetail from './pages/DocumentDetail';
import Permissions from './pages/Permissions';
import AuditLogs from './pages/AuditLogs';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute><Navbar /></PrivateRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/upload" element={<Upload />} />
        <Route path="/documents/:id" element={<DocumentDetail />} />
        <Route path="/documents/:id/permissions" element={<Permissions />} />
        <Route path="/audit" element={<AuditLogs />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;