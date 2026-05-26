/**
 * Global application layout with navigation sidebar and top app bar.
 */

import type { ReactNode } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top navigation bar */}
      <AppBar
        position="fixed"
        sx={{
          background: 'linear-gradient(135deg, #1A1D2E 0%, #0F1117 100%)',
          borderBottom: '1px solid rgba(108,99,255,0.2)',
          boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
        }}
      >
        <Toolbar>
          <ArchitectureIcon
            sx={{ mr: 1.5, color: 'primary.main', fontSize: 28 }}
          />
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #6C63FF, #00BFA6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
            }}
            onClick={() => navigate('/')}
          >
            HLD / LLD Generator
          </Typography>
          <Tooltip title="Dashboard">
            <IconButton color="inherit" onClick={() => navigate('/')}>
              <HomeIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Main content area with toolbar offset */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '64px',
          p: 3,
          minHeight: 'calc(100vh - 64px)',
          background: 'linear-gradient(180deg, #0F1117 0%, #151722 100%)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
