import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
} from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { useAuth } from '../hooks/useAuth';

/**
 * Login page with library-themed branding.
 * Email-based authentication with optional display name.
 */
const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, displayName || undefined);
      navigate('/library');
    } catch {
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Gradient background with a warm library feel
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        px: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 4,
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            background: 'rgba(255,255,255,0.95)',
          }}
        >
          {/* App icon and title */}
          <Box sx={{ mb: 3 }}>
            <AutoStoriesIcon
              sx={{
                fontSize: 64,
                color: '#667eea',
                mb: 1,
              }}
            />
            <Typography variant="h4" fontWeight={700} sx={{ color: '#1a1a2e' }}>
              Digital Library
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Your personal file organizer
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Display Name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              sx={{ mb: 3 }}
              placeholder="How should we call you?"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={!email || isSubmitting}
              sx={{
                py: 1.5,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
                },
              }}
            >
              {isSubmitting ? 'Signing in…' : 'Enter Library'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
