/**
 * CareAI Admin Dashboard - Main App Component
 * Routes between login and authenticated admin pages.
 * Provides sidebar navigation layout for admin portal.
 */

import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authApi } from './services/api';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import DoctorsPage from './pages/DoctorsPage';
import AnalyticsPage from './pages/AnalyticsPage';

// User type for admin session
interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

function App() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      authApi.getProfile()
        .then(res => {
          if (res.data.role === 'admin') {
            setUser(res.data);
          } else {
            localStorage.removeItem('admin_token');
          }
        })
        .catch(() => localStorage.removeItem('admin_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Handle successful login
  const handleLogin = (userData: AdminUser, token: string) => {
    localStorage.setItem('admin_token', token);
    setUser(userData);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#1a73e8' }}>CareAI</div>
          <p style={{ color: '#757575', marginTop: 8 }}>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated: show login page
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Authenticated admin layout with sidebar
  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🏥 CareAI</h1>
          <p>Admin Dashboard</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>
            <span>📊</span> Dashboard
          </NavLink>
          <NavLink to="/users">
            <span>👥</span> User Management
          </NavLink>
          <NavLink to="/doctors">
            <span>👨‍⚕️</span> Doctor Onboarding
          </NavLink>
          <NavLink to="/analytics">
            <span>📈</span> Analytics
          </NavLink>
        </nav>
        <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, padding: '0 24px' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{user.full_name}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{user.email}</div>
            <button
              onClick={handleLogout}
              style={{
                marginTop: 12, background: 'rgba(255,255,255,0.15)', border: 'none',
                color: 'white', padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, width: '100%',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
