/**
 * Admin Login Page - Authentication form for admin users.
 * Validates admin role and provides demo account info.
 */

import { useState } from 'react';
import { authApi } from '../services/api';

interface LoginProps {
  onLogin: (user: { id: number; email: string; full_name: string; role: string }, token: string) => void;
}

function LoginPage({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(email, password);
      const { access_token, user } = res.data;

      // Verify admin role
      if (user.role !== 'admin') {
        setError('Access denied. Admin role required.');
        setLoading(false);
        return;
      }

      onLogin(user, access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48 }}>🏥</div>
        </div>
        <h1>CareAI Admin</h1>
        <p className="subtitle">Healthcare Platform Management Portal</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@careai.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: 16, padding: '14px', fontSize: 16 }}
          >
            {loading ? 'Logging in...' : 'Login to Dashboard'}
          </button>
        </form>

        {/* Demo credentials info */}
        <div style={{
          marginTop: 24, padding: 16, background: '#e3f2fd',
          borderRadius: 12, fontSize: 13,
        }}>
          <strong>Demo Admin Account:</strong>
          <br />admin@careai.com / admin123
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
