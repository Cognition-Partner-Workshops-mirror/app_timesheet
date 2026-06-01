/**
 * Public layout for unauthenticated users.
 * Shows a simple header with EventMarket branding, Sign In and Register buttons.
 * Used for pages accessible without login (Browse Services, Service Detail).
 */

import { Outlet, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

export default function PublicLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top navigation bar */}
      <AppBar position="static" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
        <Toolbar>
          <Typography
            variant="h6" fontWeight="bold" color="primary"
            sx={{ cursor: 'pointer', flexGrow: 1 }}
            onClick={() => navigate('/services')}
          >
            EventMarket
          </Typography>

          {/* Show different buttons based on auth state */}
          {user ? (
            <Button variant="contained" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button variant="contained" onClick={() => navigate('/register')}>
                Register
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Page content */}
      <Container maxWidth="lg" sx={{ flex: 1, py: 3 }}>
        <Outlet />
      </Container>

      {/* Simple footer */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} EventMarket — Event Services Marketplace
        </Typography>
      </Box>
    </Box>
  );
}
