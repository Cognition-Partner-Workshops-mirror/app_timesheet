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
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BookIcon from '@mui/icons-material/Book';
import { useAuth } from '../hooks/useAuth';

/**
 * Login page with animated book branding and floating decorations.
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        px: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Floating decorative book icons in background */}
      <Box sx={{ position: 'absolute', top: '12%', left: '8%', opacity: 0.12 }} className="animate-drift" style={{ animationDelay: '0s' }}>
        <MenuBookIcon sx={{ fontSize: 80, color: '#fff' }} />
      </Box>
      <Box sx={{ position: 'absolute', top: '25%', right: '10%', opacity: 0.1 }} className="animate-drift" style={{ animationDelay: '2s' }}>
        <BookIcon sx={{ fontSize: 60, color: '#fff' }} />
      </Box>
      <Box sx={{ position: 'absolute', bottom: '20%', left: '15%', opacity: 0.08 }} className="animate-drift" style={{ animationDelay: '4s' }}>
        <AutoStoriesIcon sx={{ fontSize: 100, color: '#fff' }} />
      </Box>
      <Box sx={{ position: 'absolute', bottom: '30%', right: '6%', opacity: 0.1 }} className="animate-drift" style={{ animationDelay: '1s' }}>
        <MenuBookIcon sx={{ fontSize: 50, color: '#fff' }} />
      </Box>
      <Box sx={{ position: 'absolute', top: '60%', left: '45%', opacity: 0.06 }} className="animate-drift" style={{ animationDelay: '3s' }}>
        <BookIcon sx={{ fontSize: 90, color: '#fff' }} />
      </Box>

      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={12}
          className="animate-slide-up"
          sx={{
            p: 4,
            borderRadius: 4,
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            background: 'rgba(255,255,255,0.95)',
          }}
        >
          {/* Animated floating book icon */}
          <Box sx={{ mb: 3 }}>
            <Box className="animate-float-book" sx={{ display: 'inline-block' }}>
              <AutoStoriesIcon
                sx={{
                  fontSize: 72,
                  color: '#667eea',
                  mb: 1,
                  filter: 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.4))',
                }}
              />
            </Box>
            <Typography variant="h4" fontWeight={700} sx={{ color: '#1a1a2e' }}>
              Digital Library
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Your personal local library
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
