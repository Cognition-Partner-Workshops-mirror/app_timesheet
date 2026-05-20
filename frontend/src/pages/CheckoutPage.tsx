import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Grid, Box, Button, TextField, Paper, CircularProgress,
  Alert, Divider, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Payment, ArrowBack } from '@mui/icons-material';
import apiClient from '../api/client';
import type { CartItem, CartResponse } from '../types/api';

// Checkout page with shipping form, payment method, and order review
export default function CheckoutPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState({ itemCount: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Shipping form fields
  const [form, setForm] = useState({
    shipping_name: '',
    shipping_address: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip: '',
    shipping_phone: '',
    payment_method: 'credit_card'
  });

  // Load cart to verify it's not empty before checkout
  useEffect(() => {
    apiClient.get<CartResponse>('/cart')
      .then(res => {
        if (res.data.items.length === 0) {
          navigate('/cart');
          return;
        }
        setItems(res.data.items);
        setSummary(res.data.summary);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load cart');
        setLoading(false);
      });
  }, [navigate]);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Submit order to the backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await apiClient.post('/orders', form);
      navigate(`/orders/${response.data.order.id}`, { state: { justPlaced: true } });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to place order');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/cart')} sx={{ mb: 2 }}>
        Back to Cart
      </Button>

      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        Checkout
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Shipping & payment form */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Shipping Information
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth required label="Full Name" value={form.shipping_name} onChange={handleChange('shipping_name')} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth required label="Address" value={form.shipping_address} onChange={handleChange('shipping_address')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth required label="City" value={form.shipping_city} onChange={handleChange('shipping_city')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth required label="State" value={form.shipping_state} onChange={handleChange('shipping_state')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField fullWidth required label="ZIP Code" value={form.shipping_zip} onChange={handleChange('shipping_zip')} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth label="Phone (optional)" value={form.shipping_phone} onChange={handleChange('shipping_phone')} />
                </Grid>
              </Grid>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Payment Method
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={form.payment_method}
                  label="Payment Method"
                  onChange={(e) => setForm(prev => ({ ...prev, payment_method: e.target.value }))}
                >
                  <MenuItem value="credit_card">Credit Card</MenuItem>
                  <MenuItem value="debit_card">Debit Card</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </Grid>

          {/* Order summary sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Order Review
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {items.map(item => (
                <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ maxWidth: '60%' }}>
                    {item.name} x{item.quantity}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </Box>
              ))}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Subtotal</Typography>
                <Typography>${summary.total.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Shipping</Typography>
                <Typography color="success.main">Free</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Total</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>${summary.total.toFixed(2)}</Typography>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                startIcon={<Payment />}
                disabled={submitting}
              >
                {submitting ? 'Placing Order...' : `Place Order ($${summary.total.toFixed(2)})`}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}
