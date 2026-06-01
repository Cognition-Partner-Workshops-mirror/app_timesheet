/**
 * Root application component for Event Services Marketplace.
 * Sets up React Router with role-based route protection.
 * Routes are grouped by role: customer, business, and admin.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BrowseServicesPage from './pages/BrowseServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import CustomerBookingsPage from './pages/CustomerBookingsPage';
import BusinessDashboardPage from './pages/BusinessDashboardPage';
import BusinessServicesPage from './pages/BusinessServicesPage';
import ServiceFormPage from './pages/ServiceFormPage';
import BusinessBookingsPage from './pages/BusinessBookingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminServicesPage from './pages/AdminServicesPage';
import AdminBookingsPage from './pages/AdminBookingsPage';
import ProfilePage from './pages/ProfilePage';

import type { UserRole } from './types/api';

const queryClient = new QueryClient();

// MUI theme customization
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Protected route wrapper that checks authentication and optional role
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

// Redirect authenticated users to their role-specific home page
function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'business':
      return <Navigate to="/business/dashboard" replace />;
    case 'customer':
      return <Navigate to="/services" replace />;
    default:
      return <Navigate to="/services" replace />;
  }
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes inside layout */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                {/* Home redirects to role-appropriate page */}
                <Route path="/" element={<HomeRedirect />} />

                {/* Profile - all authenticated users */}
                <Route path="/profile" element={<ProfilePage />} />

                {/* Service browsing - all authenticated users */}
                <Route path="/services" element={<BrowseServicesPage />} />
                <Route path="/services/:id" element={<ServiceDetailPage />} />

                {/* Customer routes */}
                <Route path="/customer/bookings" element={
                  <ProtectedRoute roles={['customer']}><CustomerBookingsPage /></ProtectedRoute>
                } />

                {/* Business routes */}
                <Route path="/business/dashboard" element={
                  <ProtectedRoute roles={['business']}><BusinessDashboardPage /></ProtectedRoute>
                } />
                <Route path="/business/services" element={
                  <ProtectedRoute roles={['business']}><BusinessServicesPage /></ProtectedRoute>
                } />
                <Route path="/business/services/new" element={
                  <ProtectedRoute roles={['business']}><ServiceFormPage /></ProtectedRoute>
                } />
                <Route path="/business/services/edit/:id" element={
                  <ProtectedRoute roles={['business']}><ServiceFormPage /></ProtectedRoute>
                } />
                <Route path="/business/bookings" element={
                  <ProtectedRoute roles={['business']}><BusinessBookingsPage /></ProtectedRoute>
                } />

                {/* Admin routes */}
                <Route path="/admin/dashboard" element={
                  <ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>
                } />
                <Route path="/admin/services" element={
                  <ProtectedRoute roles={['admin']}><AdminServicesPage /></ProtectedRoute>
                } />
                <Route path="/admin/bookings" element={
                  <ProtectedRoute roles={['admin']}><AdminBookingsPage /></ProtectedRoute>
                } />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
