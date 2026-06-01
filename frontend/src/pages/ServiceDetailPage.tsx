/**
 * Service detail page - shows full service info, reviews, and booking form.
 * Customers can book the service; other roles see read-only details.
 * Prices displayed in region-based currency format.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Paper, Typography, Box, Rating, Chip, Button,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, CircularProgress, Divider, Grid
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { formatPriceRange } from '../utils/currency';
import type { Service, Review } from '../types/api';

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingData, setBookingData] = useState({
    event_date: '', event_type: '', guest_count: '', special_requests: ''
  });
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  // Fetch service details and reviews on mount
  useEffect(() => {
    if (!id) return;
    const fetchService = async () => {
      try {
        const res = await apiClient.getService(id);
        setService(res.service);
        setReviews(res.reviews);
      } catch {
        setService(null);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [id]);

  // Handle booking submission
  const handleBooking = async () => {
    if (!id || !bookingData.event_date) {
      setBookingError('Event date is required');
      return;
    }
    setBookingError('');
    try {
      await apiClient.createBooking({
        service_id: id,
        event_date: bookingData.event_date,
        event_type: bookingData.event_type,
        guest_count: bookingData.guest_count ? Number(bookingData.guest_count) : null,
        special_requests: bookingData.special_requests,
        total_amount: service?.price_min || null,
      });
      setBookingSuccess('Booking created successfully! The business owner will review your request.');
      setBookingOpen(false);
      setTimeout(() => navigate('/customer/bookings'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setBookingError(axiosErr.response?.data?.error || 'Failed to create booking');
    }
  };

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  if (!service) {
    return <Alert severity="error">Service not found</Alert>;
  }

  return (
    <Box>
      {bookingSuccess && <Alert severity="success" sx={{ mb: 2 }}>{bookingSuccess}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Service header with image */}
        <Box
          sx={{
            height: 250, mb: 3, borderRadius: 2,
            background: service.image_url
              ? `url(${service.image_url}) center/cover`
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {!service.image_url && (
            <Typography variant="h1" color="white">{service.category_icon}</Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">{service.name}</Typography>
            <Chip label={service.category_name} color="primary" size="small" sx={{ mt: 1 }} />
          </Box>
          <Box textAlign="right">
            {/* Region-based currency pricing */}
            <Typography variant="h4" color="primary" fontWeight="bold">
              {formatPriceRange(service.price_min, service.price_max)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
              <Rating value={service.avg_rating || 0} readOnly precision={0.5} />
              <Typography variant="body2">({service.review_count || 0} reviews)</Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Service description */}
        <Typography variant="body1" paragraph>
          {service.description || 'No description provided.'}
        </Typography>

        {/* Service details grid - company info, organizer, phone, location */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {service.business_name && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="primary" />
                <Typography fontWeight="bold" color="primary">{service.business_name}</Typography>
              </Box>
            </Grid>
          )}
          {service.business_owner_name && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="action" />
                <Typography>{service.business_owner_name}</Typography>
              </Box>
            </Grid>
          )}
          {service.business_phone && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon color="action" />
                <Typography>{service.business_phone}</Typography>
              </Box>
            </Grid>
          )}
          {service.city && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationOnIcon color="error" />
                <Typography>{service.location ? `${service.location}` : service.city}</Typography>
              </Box>
            </Grid>
          )}
          {service.capacity_max && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography color="text.secondary">
                Capacity: {service.capacity_min || 1} - {service.capacity_max} guests
              </Typography>
            </Grid>
          )}
        </Grid>

        {/* Book now button - customers can book, guests are prompted to login */}
        {user?.role === 'customer' ? (
          <Button variant="contained" size="large" fullWidth onClick={() => setBookingOpen(true)}>
            Book This Service
          </Button>
        ) : !user ? (
          <Button variant="contained" size="large" fullWidth onClick={() => navigate('/login')}>
            Sign In to Book This Service
          </Button>
        ) : null}
      </Paper>

      {/* Reviews section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Reviews ({reviews.length})
        </Typography>
        {reviews.length === 0 ? (
          <Typography color="text.secondary">No reviews yet.</Typography>
        ) : (
          reviews.map((review) => (
            <Box key={review.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography fontWeight="bold">{review.reviewer_name}</Typography>
                <Rating value={review.rating} readOnly size="small" />
              </Box>
              <Typography variant="body2" color="text.secondary">{review.comment}</Typography>
              <Typography variant="caption" color="text.disabled">
                {new Date(review.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          ))
        )}
      </Paper>

      {/* Booking dialog for customers */}
      <Dialog open={bookingOpen} onClose={() => setBookingOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Book: {service.name}</DialogTitle>
        <DialogContent>
          {bookingError && <Alert severity="error" sx={{ mb: 2 }}>{bookingError}</Alert>}
          <TextField
            fullWidth label="Event Date" type="date" margin="normal" required
            InputLabelProps={{ shrink: true }}
            value={bookingData.event_date}
            onChange={(e) => setBookingData({ ...bookingData, event_date: e.target.value })}
          />
          <TextField
            fullWidth label="Event Type" margin="normal"
            placeholder="e.g. Wedding, Birthday, Corporate"
            value={bookingData.event_type}
            onChange={(e) => setBookingData({ ...bookingData, event_type: e.target.value })}
          />
          <TextField
            fullWidth label="Number of Guests" type="number" margin="normal"
            value={bookingData.guest_count}
            onChange={(e) => setBookingData({ ...bookingData, guest_count: e.target.value })}
          />
          <TextField
            fullWidth label="Special Requests" margin="normal" multiline rows={3}
            value={bookingData.special_requests}
            onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleBooking}>Confirm Booking</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
