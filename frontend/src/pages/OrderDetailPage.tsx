import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Typography, Grid, Box, Paper, Chip, CircularProgress,
  Alert, Divider, Button, Table, TableHead, TableRow, TableCell, TableBody
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import apiClient from '../api/client';
import type { Order } from '../types/api';

// Maps order status to a color for the status chip
const statusColor: Record<string, 'warning' | 'info' | 'primary' | 'success' | 'error'> = {
  pending: 'warning',
  processing: 'info',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'error'
};

// Detailed order view showing items, shipping info, and status
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const justPlaced = (location.state as { justPlaced?: boolean })?.justPlaced;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get(`/orders/${id}`)
      .then(res => setOrder(res.data.order))
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Order not found'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/orders')} sx={{ mt: 2 }}>
          Back to Orders
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/orders')} sx={{ mb: 2 }}>
        Back to Orders
      </Button>

      {/* Success banner shown immediately after placing an order */}
      {justPlaced && (
        <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
          Your order has been placed successfully! Order #{order.id}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Order #{order.id}
        </Typography>
        <Chip
          label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          color={statusColor[order.status] || 'default'}
        />
      </Box>

      <Grid container spacing={3}>
        {/* Order items table */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Order Items</Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="center">Qty</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Subtotal</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {order.items?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell align="center">{item.quantity}</TableCell>
                    <TableCell align="right">${item.product_price.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ${(item.product_price * item.quantity).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Total: ${order.total_amount.toFixed(2)}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Shipping and payment details sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Shipping Details</Typography>
            <Typography variant="body2"><strong>Name:</strong> {order.shipping_name}</Typography>
            <Typography variant="body2"><strong>Address:</strong> {order.shipping_address}</Typography>
            <Typography variant="body2"><strong>City:</strong> {order.shipping_city}, {order.shipping_state} {order.shipping_zip}</Typography>
            {order.shipping_phone && (
              <Typography variant="body2"><strong>Phone:</strong> {order.shipping_phone}</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Payment</Typography>
            <Typography variant="body2">
              <strong>Method:</strong> {order.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Typography>
            <Typography variant="body2"><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
