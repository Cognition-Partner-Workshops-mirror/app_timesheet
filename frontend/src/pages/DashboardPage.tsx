import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Paper,
  alpha,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import { bankingColors } from '../theme';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const { data: workEntriesData } = useQuery({
    queryKey: ['workEntries'],
    queryFn: () => apiClient.getWorkEntries(),
  });

  const clients = clientsData?.clients || [];
  const workEntries = workEntriesData?.workEntries || [];

  const totalHours = workEntries.reduce((sum: number, entry: { hours: number }) => sum + entry.hours, 0);
  const recentEntries = workEntries.slice(0, 5);

  const statsCards = [
    {
      title: 'Total Clients',
      value: clients.length,
      icon: <BusinessIcon sx={{ fontSize: 28 }} />,
      gradient: `linear-gradient(135deg, ${bankingColors.deepBlue} 0%, ${bankingColors.accentBlue} 100%)`,
      shadowColor: bankingColors.accentBlue,
      action: () => navigate('/clients'),
    },
    {
      title: 'Work Entries',
      value: workEntries.length,
      icon: <AssignmentIcon sx={{ fontSize: 28 }} />,
      gradient: `linear-gradient(135deg, ${bankingColors.tealDark} 0%, ${bankingColors.teal} 100%)`,
      shadowColor: bankingColors.teal,
      action: () => navigate('/work-entries'),
    },
    {
      title: 'Total Hours',
      value: totalHours.toFixed(1),
      icon: <ClockIcon sx={{ fontSize: 28 }} />,
      gradient: `linear-gradient(135deg, #E65100 0%, ${bankingColors.gold} 100%)`,
      shadowColor: bankingColors.gold,
      action: () => navigate('/reports'),
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: bankingColors.navy, mb: 0.5 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: bankingColors.textSecondary }}>
          Welcome back. Here is an overview of your time tracking.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
            <Card
              onClick={stat.action}
              sx={{
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                background: alpha('#FFFFFF', 0.8),
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: stat.gradient,
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: alpha(stat.shadowColor, 0.04),
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={3}>
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{
                        color: bankingColors.textSecondary,
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: bankingColors.navy, mt: 0.5 }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '8px',
                      background: stat.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      boxShadow: `0 6px 20px ${alpha(stat.shadowColor, 0.3)}`,
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={3}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <TrendingUpIcon sx={{ color: bankingColors.teal }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: bankingColors.navy }}>
                  Recent Activity
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate('/work-entries')}
                sx={{ flexShrink: 0 }}
                size="small"
              >
                Add Entry
              </Button>
            </Box>
            {recentEntries.length > 0 ? (
              recentEntries.map((entry: { id: number; client_name: string; hours: number; date: string; description?: string }) => (
                <Box
                  key={entry.id}
                  sx={{
                    mb: 1.5,
                    p: 2,
                    borderRadius: 2,
                    background: alpha(bankingColors.surface, 0.6),
                    border: `1px solid ${alpha(bankingColors.navy, 0.04)}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: alpha(bankingColors.teal, 0.04),
                      borderColor: alpha(bankingColors.teal, 0.15),
                    },
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: bankingColors.navy }}>
                        {entry.client_name}
                      </Typography>
                      {entry.description && (
                        <Typography variant="caption" sx={{ color: bankingColors.textSecondary }}>
                          {entry.description}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: bankingColors.tealDark }}>
                        {entry.hours}h
                      </Typography>
                      <Typography variant="caption" sx={{ color: bankingColors.textSecondary }}>
                        {new Date(entry.date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <svg width="120" height="100" viewBox="0 0 120 100" style={{ marginBottom: 16 }}>
                  {/* Clock face */}
                  <circle cx="60" cy="45" r="30" fill="none" stroke={alpha(bankingColors.navy, 0.1)} strokeWidth="2" />
                  <circle cx="60" cy="45" r="2" fill={alpha(bankingColors.navy, 0.15)} />
                  {/* Clock hands */}
                  <line x1="60" y1="45" x2="60" y2="25" stroke={alpha(bankingColors.teal, 0.3)} strokeWidth="2" strokeLinecap="round" />
                  <line x1="60" y1="45" x2="72" y2="40" stroke={alpha(bankingColors.teal, 0.2)} strokeWidth="1.5" strokeLinecap="round" />
                  {/* Hour markers */}
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
                    const angle = (i * 30 - 90) * Math.PI / 180;
                    return (
                      <circle
                        key={i}
                        cx={60 + 25 * Math.cos(angle)}
                        cy={45 + 25 * Math.sin(angle)}
                        r={i % 3 === 0 ? 2 : 1}
                        fill={alpha(bankingColors.navy, i % 3 === 0 ? 0.15 : 0.08)}
                      />
                    );
                  })}
                  {/* Decorative lines below */}
                  <line x1="30" y1="88" x2="90" y2="88" stroke={alpha(bankingColors.navy, 0.06)} strokeWidth="1" />
                  <line x1="40" y1="94" x2="80" y2="94" stroke={alpha(bankingColors.navy, 0.04)} strokeWidth="1" />
                </svg>
                <Typography color="text.secondary">No work entries yet</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" mb={2.5} sx={{ fontWeight: 700, color: bankingColors.navy }}>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/clients')}
                fullWidth
                sx={{ justifyContent: 'flex-start', px: 3 }}
              >
                Add Client
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/work-entries')}
                fullWidth
                sx={{ justifyContent: 'flex-start', px: 3 }}
              >
                Add Work Entry
              </Button>
              <Button
                variant="outlined"
                startIcon={<AssessmentIcon />}
                onClick={() => navigate('/reports')}
                fullWidth
                sx={{ justifyContent: 'flex-start', px: 3 }}
              >
                View Reports
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
