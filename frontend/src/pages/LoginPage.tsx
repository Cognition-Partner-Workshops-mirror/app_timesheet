/**
 * Login page for the Event Services Marketplace.
 * Email + password form with link to registration page.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Paper, TextField, Button, Typography, Alert, Box
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" textAlign="center" gutterBottom fontWeight="bold" color="primary">
          EventMarket
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary" mb={3}>
          Sign in to your account
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth label="Email" type="email" margin="normal"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <TextField
            fullWidth label="Password" type="password" margin="normal"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
          <Button
            fullWidth variant="contained" type="submit" size="large"
            sx={{ mt: 2 }} disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </Box>

        <Typography textAlign="center" mt={2}>
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ color: '#1976d2' }}>Register here</Link>
        </Typography>

        {/* Demo credentials info for all roles */}
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>Demo Accounts:</Typography>
          <Typography variant="body2"><strong>Admin:</strong> admin@eventmarket.com / admin123</Typography>
          <Typography variant="body2"><strong>Customer:</strong> rahul@example.com / password123</Typography>
          <Typography variant="body2"><strong>Business:</strong> royal@eventmarket.com / password123</Typography>
        </Alert>
      </Paper>
    </Container>
  );
}
