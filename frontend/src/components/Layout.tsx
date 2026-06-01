/**
 * Main layout component with role-based navigation sidebar.
 * Shows different menu items based on user role (admin/business/customer).
 * Includes top app bar with user info and logout.
 */

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Box, IconButton, Divider, Chip, Avatar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import { useAuth } from '../hooks/useAuth';

const DRAWER_WIDTH = 240;

// Role-specific color chips for visual identification
const roleColors: Record<string, 'error' | 'warning' | 'success'> = {
  admin: 'error',
  business: 'warning',
  customer: 'success',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Navigation items differ by role
  const getNavItems = () => {
    if (!user) return [];

    const common = [
      { text: 'Browse Services', icon: <SearchIcon />, path: '/services' },
    ];

    switch (user.role) {
      case 'admin':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
          { text: 'Manage Users', icon: <PeopleIcon />, path: '/admin/users' },
          { text: 'All Services', icon: <StorefrontIcon />, path: '/admin/services' },
          { text: 'All Bookings', icon: <EventIcon />, path: '/admin/bookings' },
          ...common,
        ];
      case 'business':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/business/dashboard' },
          { text: 'My Services', icon: <StorefrontIcon />, path: '/business/services' },
          { text: 'Add Service', icon: <AddBusinessIcon />, path: '/business/services/new' },
          { text: 'Bookings', icon: <BookOnlineIcon />, path: '/business/bookings' },
          ...common,
        ];
      case 'customer':
        return [
          ...common,
          { text: 'My Bookings', icon: <BookOnlineIcon />, path: '/customer/bookings' },
        ];
      default:
        return common;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand header */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          EventMarket
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Services Marketplace
        </Typography>
      </Box>
      <Divider />

      {/* User info section */}
      {user && (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap fontWeight="bold">
              {user.name}
            </Typography>
            <Chip
              label={user.role}
              size="small"
              color={roleColors[user.role] || 'default'}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>
        </Box>
      )}
      <Divider />

      {/* Role-based navigation links */}
      <List sx={{ flex: 1 }}>
        {getNavItems().map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>

      <Divider />
      {/* Logout button at bottom */}
      <List>
        <ListItemButton onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top app bar (mobile) */}
      <AppBar
        position="fixed"
        sx={{
          display: { md: 'none' },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>EventMarket</Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar drawer */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: '64px', md: 0 },
          bgcolor: 'grey.50',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
