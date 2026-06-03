import React, { type ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

// Navigation items shared between drawer and bottom nav
const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Library', icon: <LibraryBooksIcon />, path: '/library' },
  { label: 'Upload', icon: <CloudUploadIcon />, path: '/upload' },
  { label: 'Collections', icon: <FolderIcon />, path: '/collections' },
];

const DRAWER_WIDTH = 240;

/**
 * Main layout shell with responsive navigation.
 * Desktop: sidebar drawer. Mobile: bottom navigation bar.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Find index of active nav item for bottom nav
  const activeIndex = navItems.findIndex((item) => location.pathname.startsWith(item.path));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Sidebar drawer content
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* App branding */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
      >
        <AutoStoriesIcon sx={{ fontSize: 32 }} />
        <Typography variant="h6" fontWeight={700} noWrap>
          Digital Library
        </Typography>
      </Box>

      {/* User info */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: '#667eea', width: 36, height: 36, fontSize: '0.9rem' }}>
          {(user?.display_name || user?.email || 'U').charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {user?.display_name || user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Box>
      </Box>
      <Divider />

      {/* Navigation links */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname.startsWith(item.path)}
              onClick={() => {
                navigate(item.path);
                setMobileDrawerOpen(false);
              }}
              sx={{
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: '#eef2ff',
                  color: '#667eea',
                  '& .MuiListItemIcon-root': { color: '#667eea' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />
      {/* Logout button */}
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ mx: 1, borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8f9fc' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid #e5e7eb',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Mobile drawer (hamburger) */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          sx={{
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar */}
        {isMobile && (
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            <Toolbar>
              <IconButton color="inherit" onClick={() => setMobileDrawerOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
              <AutoStoriesIcon sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight={700} noWrap>
                Digital Library
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3 },
            pb: { xs: 10, md: 3 }, // Extra padding on mobile for bottom nav
          }}
        >
          {children}
        </Box>

        {/* Mobile bottom navigation */}
        {isMobile && (
          <Paper
            sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}
            elevation={8}
          >
            <BottomNavigation
              value={activeIndex >= 0 ? activeIndex : 0}
              onChange={(_, newValue) => navigate(navItems[newValue].path)}
              showLabels
              sx={{
                '& .Mui-selected': { color: '#667eea' },
              }}
            >
              {navItems.map((item) => (
                <BottomNavigationAction
                  key={item.path}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </BottomNavigation>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default Layout;
