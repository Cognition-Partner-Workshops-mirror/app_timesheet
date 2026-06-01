/**
 * Business bookings management page.
 * Shows all bookings for the business user's services.
 * Allows confirming, completing, or cancelling bookings.
 */

import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Box,
  CircularProgress, Alert
} from '@mui/material';
import apiClient from '../api/client';
import type { Booking } from '../types/api';

// Map booking status to chip color
const statusColors: Record<string, 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'error',
};

export default function BusinessBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    try {
      const res = await apiClient.getBookings();
      setBookings(res.bookings);
    } catch {
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  // Update booking status (confirm, complete, or cancel)
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiClient.updateBookingStatus(id, status);
      fetchBookings();
    } catch {
      setError('Failed to update booking status');
    }
  };

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom fontWeight="bold">Manage Bookings</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {bookings.length === 0 ? (
        <Alert severity="info">No bookings yet for your services.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Service</strong></TableCell>
                <TableCell><strong>Customer</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Event Date</strong></TableCell>
                <TableCell><strong>Guests</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.service_name}</TableCell>
                  <TableCell>{booking.customer_name}</TableCell>
                  <TableCell>{booking.customer_email}</TableCell>
                  <TableCell>{new Date(booking.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>{booking.guest_count || '-'}</TableCell>
                  <TableCell>${booking.total_amount?.toLocaleString() || '-'}</TableCell>
                  <TableCell>
                    <Chip label={booking.status} size="small" color={statusColors[booking.status] || 'default'} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {/* Show action buttons based on current status */}
                      {booking.status === 'pending' && (
                        <>
                          <Button size="small" color="success" variant="outlined" onClick={() => handleStatusChange(booking.id, 'confirmed')}>
                            Confirm
                          </Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => handleStatusChange(booking.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button size="small" color="success" variant="outlined" onClick={() => handleStatusChange(booking.id, 'completed')}>
                          Complete
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
