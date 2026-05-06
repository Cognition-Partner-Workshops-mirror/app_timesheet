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
      {/* Background decorative elements */}
      <Box
        sx={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: alpha(bankingColors.teal, 0.08),
          top: '-150px',
          right: '-100px',
          filter: 'blur(60px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: alpha(bankingColors.accentBlue, 0.06),
          bottom: '-100px',
          left: '-100px',
          filter: 'blur(60px)',
        }}
      />

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
