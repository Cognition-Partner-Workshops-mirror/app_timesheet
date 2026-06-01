/**
 * Admin bookings overview page.
 * Shows all bookings across the platform with customer and business info.
 */

import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Box,
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

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
    fetchBookings();
  }, []);

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom fontWeight="bold">All Bookings</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {bookings.length === 0 ? (
        <Alert severity="info">No bookings on the platform yet.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Service</strong></TableCell>
                <TableCell><strong>Customer</strong></TableCell>
                <TableCell><strong>Business</strong></TableCell>
                <TableCell><strong>Event Date</strong></TableCell>
                <TableCell><strong>Guests</strong></TableCell>
                <TableCell><strong>Amount</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>{booking.service_name}</TableCell>
                  <TableCell>{booking.customer_name}</TableCell>
                  <TableCell>{booking.business_name || booking.business_owner_name}</TableCell>
                  <TableCell>{new Date(booking.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>{booking.guest_count || '-'}</TableCell>
                  <TableCell>${booking.total_amount?.toLocaleString() || '-'}</TableCell>
                  <TableCell>
                    <Chip label={booking.status} size="small" color={statusColors[booking.status] || 'default'} />
                  </TableCell>
                  <TableCell>{new Date(booking.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
