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
  alpha,
} from '@mui/material';
import {
  AccessTime as ClockIcon,
  LockOutlined as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { bankingColors } from '../theme';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
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
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${bankingColors.navy} 0%, ${bankingColors.deepBlue} 50%, ${bankingColors.navyLight} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative SVG elements */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {/* Floating hexagon grid pattern - top right */}
        <svg width="400" height="400" viewBox="0 0 400 400" style={{ position: 'absolute', top: -60, right: -40, opacity: 0.06 }}>
          {[0, 1, 2, 3, 4].map(row =>
            [0, 1, 2, 3].map(col => (
              <polygon
                key={`${row}-${col}`}
                points="30,0 60,17 60,52 30,69 0,52 0,17"
                fill="none"
                stroke="#00BFA6"
                strokeWidth="1"
                transform={`translate(${col * 70 + (row % 2) * 35}, ${row * 62})`}
              />
            ))
          )}
        </svg>
        {/* Concentric circles - bottom left */}
        <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: 'absolute', bottom: -80, left: -60, opacity: 0.05 }}>
          <circle cx="150" cy="150" r="140" fill="none" stroke="#4DD0C8" strokeWidth="0.5" />
          <circle cx="150" cy="150" r="110" fill="none" stroke="#4DD0C8" strokeWidth="0.5" />
          <circle cx="150" cy="150" r="80" fill="none" stroke="#4DD0C8" strokeWidth="0.5" />
          <circle cx="150" cy="150" r="50" fill="none" stroke="#4DD0C8" strokeWidth="0.5" />
          <circle cx="150" cy="150" r="20" fill="none" stroke="#4DD0C8" strokeWidth="1" />
        </svg>
        {/* Diagonal lines accent - top left */}
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', top: 40, left: 40, opacity: 0.04 }}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <line key={i} x1={i * 30} y1="0" x2="0" y2={i * 30} stroke="#2196F3" strokeWidth="0.5" />
          ))}
        </svg>
        {/* Dot grid - center right */}
        <svg width="200" height="300" viewBox="0 0 200 300" style={{ position: 'absolute', top: '30%', right: 60, opacity: 0.08 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(row =>
            [0, 1, 2, 3, 4, 5, 6].map(col => (
              <circle key={`${row}-${col}`} cx={col * 28 + 14} cy={row * 28 + 14} r="1.5" fill="#00BFA6" />
            ))
          )}
        </svg>
      </Box>

      <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: 5,
            width: '100%',
            maxWidth: 440,
            mx: 'auto',
            background: alpha('#FFFFFF', 0.08),
            backdropFilter: 'blur(24px)',
            border: `1px solid ${alpha('#FFFFFF', 0.12)}`,
            borderRadius: 3,
            boxShadow: `0 32px 80px ${alpha('#000000', 0.3)}`,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${bankingColors.teal} 0%, ${bankingColors.tealDark} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2.5,
                boxShadow: `0 8px 24px ${alpha(bankingColors.teal, 0.3)}`,
              }}
            >
              <ClockIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography
              component="h1"
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #FFFFFF 0%, rgba(255,255,255,0.8) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5,
              }}
            >
              TimeTracker
            </Typography>
            <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.5) }}>
              Secure time management portal
            </Typography>
            {/* Decorative line under title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <Box sx={{ height: '1px', width: 40, background: `linear-gradient(90deg, transparent, ${alpha(bankingColors.teal, 0.5)})` }} />
              <svg width="8" height="8" viewBox="0 0 8 8">
                <rect x="1" y="1" width="6" height="6" rx="1" fill="none" stroke={bankingColors.teal} strokeWidth="1" opacity="0.6" />
              </svg>
              <Box sx={{ height: '1px', width: 40, background: `linear-gradient(90deg, ${alpha(bankingColors.teal, 0.5)}, transparent)` }} />
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderRadius: 1.5,
              background: alpha(bankingColors.teal, 0.1),
              border: `1px solid ${alpha(bankingColors.teal, 0.2)}`,
              mb: 3,
            }}
          >
            <LockIcon sx={{ color: bankingColors.tealLight, fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.7), fontSize: '0.75rem' }}>
              No password required — email-based authentication
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#FFFFFF',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha('#FFFFFF', 0.2),
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(bankingColors.teal, 0.5),
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: bankingColors.teal,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: alpha('#FFFFFF', 0.5),
                  '&.Mui-focused': {
                    color: bankingColors.tealLight,
                  },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 1, py: 1.5, fontSize: '1rem' }}
              disabled={isLoading || !email}
            >
              {isLoading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
