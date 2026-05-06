import { createTheme, alpha } from '@mui/material/styles';

const bankingColors = {
  navy: '#0A1628',
  navyLight: '#132039',
  deepBlue: '#1B3A5C',
  teal: '#00BFA6',
  tealDark: '#009688',
  tealLight: '#4DD0C8',
  accentBlue: '#2196F3',
  gold: '#FFB74D',
  surface: '#F0F4F8',
  surfaceLight: '#FFFFFF',
  textPrimary: '#0A1628',
  textSecondary: '#546E7A',
  error: '#EF5350',
  success: '#66BB6A',
  warning: '#FFA726',
};

const theme = createTheme({
  palette: {
    primary: {
      main: bankingColors.deepBlue,
      dark: bankingColors.navy,
      light: bankingColors.accentBlue,
    },
    secondary: {
      main: bankingColors.teal,
      dark: bankingColors.tealDark,
      light: bankingColors.tealLight,
    },
    error: {
      main: bankingColors.error,
    },
    success: {
      main: bankingColors.success,
    },
    warning: {
      main: bankingColors.warning,
    },
    background: {
      default: bankingColors.surface,
      paper: bankingColors.surfaceLight,
    },
    text: {
      primary: bankingColors.textPrimary,
      secondary: bankingColors.textSecondary,
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 600,
    },
    body2: {
      color: bankingColors.textSecondary,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: `linear-gradient(135deg, ${bankingColors.surface} 0%, #E3EAF2 50%, ${bankingColors.surface} 100%)`,
          minHeight: '100vh',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: alpha(bankingColors.surfaceLight, 0.7),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(bankingColors.surfaceLight, 0.8)}`,
          boxShadow: `0 8px 32px ${alpha(bankingColors.navy, 0.08)}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 16px 48px ${alpha(bankingColors.navy, 0.12)}`,
            border: `1px solid ${alpha(bankingColors.teal, 0.3)}`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: alpha(bankingColors.surfaceLight, 0.75),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(bankingColors.surfaceLight, 0.8)}`,
          boxShadow: `0 4px 24px ${alpha(bankingColors.navy, 0.06)}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${bankingColors.navy} 0%, ${bankingColors.deepBlue} 100%)`,
          backdropFilter: 'blur(20px)',
          boxShadow: `0 4px 24px ${alpha(bankingColors.navy, 0.2)}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: `linear-gradient(180deg, ${bankingColors.navy} 0%, ${bankingColors.navyLight} 100%)`,
          color: '#FFFFFF',
          borderRight: `1px solid ${alpha('#FFFFFF', 0.08)}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        contained: {
          background: `linear-gradient(135deg, ${bankingColors.teal} 0%, ${bankingColors.tealDark} 100%)`,
          color: '#FFFFFF',
          boxShadow: `0 4px 16px ${alpha(bankingColors.teal, 0.3)}`,
          '&:hover': {
            background: `linear-gradient(135deg, ${bankingColors.tealLight} 0%, ${bankingColors.teal} 100%)`,
            boxShadow: `0 8px 24px ${alpha(bankingColors.teal, 0.4)}`,
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: alpha(bankingColors.deepBlue, 0.3),
          color: bankingColors.deepBlue,
          '&:hover': {
            borderColor: bankingColors.teal,
            color: bankingColors.teal,
            background: alpha(bankingColors.teal, 0.05),
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: alpha(bankingColors.deepBlue, 0.05),
            color: bankingColors.deepBlue,
            fontWeight: 700,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: `2px solid ${alpha(bankingColors.deepBlue, 0.1)}`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(bankingColors.teal, 0.04),
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha(bankingColors.navy, 0.06)}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
        outlined: {
          borderColor: alpha(bankingColors.deepBlue, 0.2),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          background: alpha(bankingColors.surfaceLight, 0.95),
          backdropFilter: 'blur(20px)',
          boxShadow: `0 24px 80px ${alpha(bankingColors.navy, 0.15)}`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 0.2s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: bankingColors.teal,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: bankingColors.teal,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 12px',
          transition: 'all 0.2s ease',
          '&.Mui-selected': {
            background: `linear-gradient(135deg, ${alpha(bankingColors.teal, 0.2)} 0%, ${alpha(bankingColors.tealDark, 0.15)} 100%)`,
            color: bankingColors.tealLight,
            '& .MuiListItemIcon-root': {
              color: bankingColors.tealLight,
            },
            '&:hover': {
              background: `linear-gradient(135deg, ${alpha(bankingColors.teal, 0.25)} 0%, ${alpha(bankingColors.tealDark, 0.2)} 100%)`,
            },
          },
          '&:hover': {
            background: alpha('#FFFFFF', 0.08),
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: alpha('#FFFFFF', 0.6),
          minWidth: 40,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.9rem',
          fontWeight: 500,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${bankingColors.teal} 0%, ${bankingColors.tealDark} 100%)`,
          fontWeight: 700,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        },
      },
    },
  },
});

export default theme;
export { bankingColors };
