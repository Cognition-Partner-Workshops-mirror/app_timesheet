/**
 * Admin dashboard - platform overview with key statistics.
 * Shows total users, businesses, pending approvals, services, bookings, and revenue.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Paper, Grid, Box, CircularProgress, Chip, Button
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StorefrontIcon from '@mui/icons-material/Storefront';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BusinessIcon from '@mui/icons-material/Business';
import apiClient from '../api/client';
import type { DashboardStats, Booking } from '../types/api';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiClient.getAdminDashboard();
        setStats(res.stats);
        setRecentBookings(res.recent_bookings);
      } catch {
        // handled by empty state
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  if (!stats) return null;

  // Stat cards configuration
  const statCards = [
    { label: 'Total Users', value: stats.total_users, icon: <PeopleIcon />, color: '#1976d2' },
    { label: 'Businesses', value: stats.total_businesses, icon: <BusinessIcon />, color: '#ed6c02' },
    { label: 'Pending Approvals', value: stats.pending_approvals, icon: <PendingActionsIcon />, color: '#d32f2f' },
    { label: 'Total Services', value: stats.total_services, icon: <StorefrontIcon />, color: '#2e7d32' },
    { label: 'Total Bookings', value: stats.total_bookings, icon: <BookOnlineIcon />, color: '#9c27b0' },
    { label: 'Revenue', value: `$${stats.total_revenue.toLocaleString()}`, icon: <AttachMoneyIcon />, color: '#0288d1' },
  ];

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom fontWeight="bold">Admin Dashboard</Typography>

      {/* Stats grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.label}>
            <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${card.color}15`, color: card.color }}>
                {card.icon}
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="bold">{card.value}</Typography>
                <Typography variant="body2" color="text.secondary">{card.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Quick action buttons */}
      {stats.pending_approvals > 0 && (
        <Button
          variant="contained" color="warning" sx={{ mb: 3 }}
          onClick={() => navigate('/admin/users')}
        >
          Review {stats.pending_approvals} Pending Approval(s)
        </Button>
      )}

      {/* Recent bookings feed */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Recent Bookings</Typography>
        {recentBookings.length === 0 ? (
          <Typography color="text.secondary">No bookings yet.</Typography>
        ) : (
          recentBookings.map((booking) => (
            <Box key={booking.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #eee' }}>
              <Box>
                <Typography fontWeight="bold">{booking.service_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {booking.customer_name} - {new Date(booking.created_at).toLocaleDateString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2">${booking.total_amount?.toLocaleString() || '-'}</Typography>
                <Chip label={booking.status} size="small" />
              </Box>
            </Box>
          ))
        )}
      </Paper>
    </Container>
  );
}
