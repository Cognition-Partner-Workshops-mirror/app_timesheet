/**
 * Root application component.
 * Sets up MUI theming, routing, and global layout.
 */

import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import HLDView from './pages/HLDView';
import LLDView from './pages/LLDView';

/* Dark-themed MUI palette for a professional, modern look */
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6C63FF' },
    secondary: { main: '#00BFA6' },
    background: {
      default: '#0F1117',
      paper: '#1A1D2E',
    },
    text: {
      primary: '#E8EAED',
      secondary: '#9AA0A6',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/project/:projectId" element={<ProjectView />} />
            <Route path="/project/:projectId/hld" element={<HLDView />} />
            <Route path="/project/:projectId/lld/:serviceId" element={<LLDView />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
