import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Store, ClipboardList, MessageSquare, AlertTriangle, LogOut } from 'lucide-react';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VendorsPage from './pages/VendorsPage';
import AlertsPage from './pages/AlertsPage';
import DistributionsPage from './pages/DistributionsPage';
import GrievancesPage from './pages/GrievancesPage';
import './index.css';

function Sidebar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '◀' : '▶'}
        </button>
      <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/logo.png" alt="Aahar Logo" style={{ width: '100%', maxWidth: '160px', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
        <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginTop: '8px', textTransform: 'uppercase' }}>Admin Dashboard</span>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-title">Overview</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><LayoutDashboard size={18} strokeWidth={2} /></span> <span className="nav-text">Dashboard</span>
        </NavLink>

        <div className="nav-section-title">Management</div>
        <NavLink to="/vendors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Store size={18} strokeWidth={2} /></span> <span className="nav-text">Vendors</span>
        </NavLink>
        <NavLink to="/distributions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><ClipboardList size={18} strokeWidth={2} /></span> <span className="nav-text">Distributions</span>
        </NavLink>
        <NavLink to="/grievances" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><MessageSquare size={18} strokeWidth={2} /></span> <span className="nav-text">Grievances</span>
        </NavLink>

        <div className="nav-section-title">Intelligence</div>
        <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><AlertTriangle size={18} strokeWidth={2} /></span> <span className="nav-text">AI Alerts</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{user?.fullName?.charAt(0) || 'A'}</div>
          <div className="user-info">
            <div className="user-name">{user?.fullName || 'Admin'}</div>
            <div className="user-role">System Administrator</div>
          </div>
        </div>
        <button className="nav-item" onClick={logout} style={{ marginTop: 8, width: '100%', border: 'none', background: 'none', color: '#ef4444' }}>
          <span className="nav-icon"><LogOut size={18} strokeWidth={2} /></span> <span className="nav-text">Sign Out</span>
        </button>
      </div>
    </div>
    {isOpen && <div className="sidebar-backdrop" onClick={() => setIsOpen(false)}></div>}
    </>
  );
}

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/vendors" element={<ProtectedRoute><VendorsPage /></ProtectedRoute>} />
      <Route path="/distributions" element={<ProtectedRoute><DistributionsPage /></ProtectedRoute>} />
      <Route path="/grievances" element={<ProtectedRoute><GrievancesPage /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
