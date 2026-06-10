import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * LoginPage provides two authentication methods:
 * 1. Primary: "Sign in with Microsoft" button (Azure AD SSO via MSAL popup)
 * 2. Fallback: Legacy email-only form (shown when VITE_ENABLE_EMAIL_LOGIN=true)
 */
const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isEmailLoginEnabled } = useAuth();
  const navigate = useNavigate();

  /** Handle Microsoft SSO login via MSAL popup */
  const handleSsoLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      await login();
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { errorMessage?: string; message?: string };
      setError(error.errorMessage || error.message || 'SSO login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Handle legacy email-only login form submission */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email);
      navigate('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          px: 2,
        }}
      >
        <Paper elevation={3} sx={{ padding: 3, width: '100%', maxWidth: 500 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Time Tracker
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
            Sign in to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Primary SSO login button */}
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleSsoLogin}
            disabled={isLoading}
            sx={{ mt: 1, mb: 1, py: 1.5 }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign in with Microsoft'
            )}
          </Button>

          {/* Legacy email-only login fallback (behind env flag) */}
          {isEmailLoginEnabled && (
            <>
              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  or use email (dev mode)
                </Typography>
              </Divider>

              <Box component="form" onSubmit={handleEmailSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="outlined"
                  sx={{ mt: 2, mb: 1 }}
                  disabled={isLoading || !email}
                >
                  {isLoading ? <CircularProgress size={24} /> : 'Log In with Email'}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
