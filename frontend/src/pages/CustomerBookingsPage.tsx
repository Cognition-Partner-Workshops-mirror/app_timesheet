/**
 * Customer bookings page - shows all bookings made by the logged-in customer.
 * Allows cancelling pending bookings and reviewing completed ones.
 */

import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Box,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Rating
} from '@mui/material';
import apiClient from '../api/client';
import type { Booking } from '../types/api';

// Map booking status to MUI chip color
const statusColors: Record<string, 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'error',
};

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Review dialog state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [reviewError, setReviewError] = useState('');

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

  // Cancel a pending booking
  const handleCancel = async (id: string) => {
    try {
      await apiClient.updateBookingStatus(id, 'cancelled');
      fetchBookings();
    } catch {
      setError('Failed to cancel booking');
    }
  };

  // Submit a review for a completed booking
  const handleReview = async () => {
    if (!selectedBooking) return;
    setReviewError('');
    try {
      await apiClient.createReview({
        booking_id: selectedBooking.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
      });
      setReviewOpen(false);
      setReviewData({ rating: 5, comment: '' });
      fetchBookings();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setReviewError(axiosErr.response?.data?.error || 'Failed to submit review');
    }
  };

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom fontWeight="bold">My Bookings</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {bookings.length === 0 ? (
        <Alert severity="info">You haven&apos;t made any bookings yet.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Service</strong></TableCell>
                <TableCell><strong>Provider</strong></TableCell>
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
                  <TableCell>{booking.business_name || booking.business_owner_name}</TableCell>
                  <TableCell>{new Date(booking.event_date).toLocaleDateString()}</TableCell>
                  <TableCell>{booking.guest_count || '-'}</TableCell>
                  <TableCell>${booking.total_amount?.toLocaleString() || '-'}</TableCell>
                  <TableCell>
                    <Chip label={booking.status} size="small" color={statusColors[booking.status] || 'default'} />
                  </TableCell>
                  <TableCell>
                    {booking.status === 'pending' && (
                      <Button size="small" color="error" onClick={() => handleCancel(booking.id)}>
                        Cancel
                      </Button>
                    )}
                    {booking.status === 'completed' && (
                      <Button
                        size="small" color="primary"
                        onClick={() => { setSelectedBooking(booking); setReviewOpen(true); }}
                      >
                        Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Review dialog */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review: {selectedBooking?.service_name}</DialogTitle>
        <DialogContent>
          {reviewError && <Alert severity="error" sx={{ mb: 2 }}>{reviewError}</Alert>}
          <Box sx={{ my: 2 }}>
            <Typography gutterBottom>Rating</Typography>
            <Rating
              value={reviewData.rating}
              onChange={(_, val) => setReviewData({ ...reviewData, rating: val || 5 })}
              size="large"
            />
          </Box>
          <TextField
            fullWidth label="Comment" multiline rows={3}
            value={reviewData.comment}
            onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleReview}>Submit Review</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
