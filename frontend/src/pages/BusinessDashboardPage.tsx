/**
 * Business dashboard - overview of the business user's services and bookings.
 * Shows key metrics and recent booking activity.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Paper, Grid, Box, CircularProgress, Alert,
  Button, Chip
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import type { Service, Booking } from '../types/api';

export default function BusinessDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [svcRes, bkgRes] = await Promise.all([
          apiClient.getMyServices(),
          apiClient.getBookings(),
        ]);
        setServices(svcRes.services);
        setBookings(bkgRes.bookings);
      } catch {
        // Handled by empty state
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  // Business account not yet approved by admin
  if (user && !user.is_approved) {
    return (
      <Container maxWidth="md">
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="h6">Account Pending Approval</Typography>
          <Typography>Your business account is awaiting admin approval. You&apos;ll be able to list services once approved.</Typography>
        </Alert>
      </Container>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom fontWeight="bold">Business Dashboard</Typography>

      {/* Stats cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <StorefrontIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h3" fontWeight="bold">{services.length}</Typography>
            <Typography color="text.secondary">Active Services</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <PendingActionsIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            <Typography variant="h3" fontWeight="bold">{pendingBookings}</Typography>
            <Typography color="text.secondary">Pending Bookings</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <BookOnlineIcon sx={{ fontSize: 40, color: 'success.main' }} />
            <Typography variant="h3" fontWeight="bold">{confirmedBookings}</Typography>
            <Typography color="text.secondary">Confirmed Bookings</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Quick actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button variant="contained" onClick={() => navigate('/business/services/new')}>
          Add New Service
        </Button>
        <Button variant="outlined" onClick={() => navigate('/business/bookings')}>
          View All Bookings
        </Button>
      </Box>

      {/* Recent bookings preview */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Recent Bookings</Typography>
        {bookings.length === 0 ? (
          <Typography color="text.secondary">No bookings yet.</Typography>
        ) : (
          bookings.slice(0, 5).map((booking) => (
            <Box key={booking.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid #eee' }}>
              <Box>
                <Typography fontWeight="bold">{booking.service_name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {booking.customer_name} - {new Date(booking.event_date).toLocaleDateString()}
                </Typography>
              </Box>
              <Chip label={booking.status} size="small" color={booking.status === 'pending' ? 'warning' : 'default'} />
            </Box>
          ))
        )}
      </Paper>
    </Container>
  );
}
