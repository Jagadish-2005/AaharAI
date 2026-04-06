import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ClipboardList, LogOut, Inbox } from 'lucide-react';
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import DistributePage from './pages/DistributePage';
import HistoryPage from './pages/HistoryPage';
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
        <span style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginTop: '8px', textTransform: 'uppercase' }}>Vendor Portal</span>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-title">Main Menu</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><LayoutDashboard size={18} strokeWidth={2} /></span> <span className="nav-text">Dashboard</span>
        </NavLink>
        <NavLink to="/beneficiaries" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Users size={18} strokeWidth={2} /></span> <span className="nav-text">Beneficiaries</span>
        </NavLink>
        <NavLink to="/distribute" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Package size={18} strokeWidth={2} /></span> <span className="nav-text">Distribute</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><ClipboardList size={18} strokeWidth={2} /></span> <span className="nav-text">History</span>
        </NavLink>
        <div className="nav-section-title" style={{ marginTop: '16px' }}>Communications</div>
        <NavLink to="/inbox" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Inbox size={18} strokeWidth={2} /></span> <span className="nav-text">Inbox</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.charAt(0) || 'V'}</div>
          <div className="user-info">
            <div className="user-name">{user?.shopName || 'Vendor'}</div>
            <div className="user-role">{user?.vendorCode}</div>
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
      <Route path="/beneficiaries" element={<ProtectedRoute><BeneficiariesPage /></ProtectedRoute>} />
      <Route path="/distribute" element={<ProtectedRoute><DistributePage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute><GrievancesPage /></ProtectedRoute>} />
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
