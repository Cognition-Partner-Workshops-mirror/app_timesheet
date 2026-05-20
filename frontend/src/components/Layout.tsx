import { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Badge, Box, Container,
  Menu, MenuItem, Divider, useTheme, useMediaQuery
} from '@mui/material';
import {
  ShoppingCart, Person, Store, Menu as MenuIcon, Logout, ListAlt
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import type { CartResponse } from '../types/api';

// Main application layout with responsive navbar and footer
export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [cartCount, setCartCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  // Fetch cart item count for the badge
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    apiClient.get<CartResponse>('/cart')
      .then(res => setCartCount(res.data.summary.itemCount))
      .catch(() => setCartCount(0));
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setAnchorEl(null);
    navigate('/');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top navigation bar */}
      <AppBar position="sticky" sx={{ bgcolor: '#1a237e' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters>
            {/* Logo / brand link */}
            <Store sx={{ mr: 1 }} />
            <Typography
              variant="h6"
              component={Link}
              to="/"
              sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
            >
              ShopHub
            </Typography>

            {/* Desktop navigation links */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button color="inherit" component={Link} to="/products">Products</Button>

                {isAuthenticated ? (
                  <>
                    <IconButton color="inherit" component={Link} to="/cart">
                      <Badge badgeContent={cartCount} color="error">
                        <ShoppingCart />
                      </Badge>
                    </IconButton>
                    <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
                      <Person />
                    </IconButton>
                    {/* User dropdown menu */}
                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                      <MenuItem disabled>
                        <Typography variant="body2">{user?.name} ({user?.email})</Typography>
                      </MenuItem>
                      <Divider />
                      <MenuItem onClick={() => { setAnchorEl(null); navigate('/orders'); }}>
                        <ListAlt sx={{ mr: 1 }} /> My Orders
                      </MenuItem>
                      <MenuItem onClick={handleLogout}>
                        <Logout sx={{ mr: 1 }} /> Logout
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <>
                    <Button color="inherit" component={Link} to="/login">Login</Button>
                    <Button color="inherit" variant="outlined" component={Link} to="/register"
                      sx={{ borderColor: 'rgba(255,255,255,0.5)' }}>
                      Register
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Mobile hamburger menu */}
            {isMobile && (
              <>
                {isAuthenticated && (
                  <IconButton color="inherit" component={Link} to="/cart" sx={{ mr: 1 }}>
                    <Badge badgeContent={cartCount} color="error">
                      <ShoppingCart />
                    </Badge>
                  </IconButton>
                )}
                <IconButton color="inherit" onClick={(e) => setMobileMenuAnchor(e.currentTarget)}>
                  <MenuIcon />
                </IconButton>
                <Menu anchorEl={mobileMenuAnchor} open={Boolean(mobileMenuAnchor)} onClose={() => setMobileMenuAnchor(null)}>
                  <MenuItem onClick={() => { setMobileMenuAnchor(null); navigate('/products'); }}>Products</MenuItem>
                  {isAuthenticated ? (
                    [
                      <MenuItem key="orders" onClick={() => { setMobileMenuAnchor(null); navigate('/orders'); }}>My Orders</MenuItem>,
                      <Divider key="div" />,
                      <MenuItem key="logout" onClick={() => { setMobileMenuAnchor(null); handleLogout(); }}>Logout</MenuItem>
                    ]
                  ) : (
                    [
                      <MenuItem key="login" onClick={() => { setMobileMenuAnchor(null); navigate('/login'); }}>Login</MenuItem>,
                      <MenuItem key="register" onClick={() => { setMobileMenuAnchor(null); navigate('/register'); }}>Register</MenuItem>
                    ]
                  )}
                </Menu>
              </>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main content area rendered by nested routes */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: '#f5f5f5' }}>
        <Outlet />
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ bgcolor: '#1a237e', color: 'white', py: 3, mt: 'auto' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" align="center">
            &copy; {new Date().getFullYear()} ShopHub - Your one-stop ecommerce store. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
