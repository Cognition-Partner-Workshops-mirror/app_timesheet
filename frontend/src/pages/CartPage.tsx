import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Button, IconButton, Paper, Grid, TextField,
  CircularProgress, Alert, Divider
} from '@mui/material';
import { Delete, Add, Remove, ShoppingCartCheckout, ArrowBack } from '@mui/icons-material';
import apiClient from '../api/client';
import type { CartItem, CartResponse } from '../types/api';

// Shopping cart page showing items, quantity controls, and order summary
export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState({ itemCount: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch cart contents
  const fetchCart = async () => {
    try {
      const response = await apiClient.get<CartResponse>('/cart');
      setItems(response.data.items);
      setSummary(response.data.summary);
    } catch {
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCart(); }, []);

  // Update quantity for a single cart item
  const updateQuantity = async (itemId: number, newQuantity: number) => {
    try {
      await apiClient.put(`/cart/${itemId}`, { quantity: newQuantity });
      fetchCart();
    } catch {
      setError('Failed to update quantity');
    }
  };

  // Remove a single item from the cart
  const removeItem = async (itemId: number) => {
    try {
      await apiClient.delete(`/cart/${itemId}`);
      fetchCart();
    } catch {
      setError('Failed to remove item');
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
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        Shopping Cart
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {items.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Your cart is empty
          </Typography>
          <Button variant="contained" startIcon={<ArrowBack />} onClick={() => navigate('/products')}>
            Continue Shopping
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Cart items list */}
          <Grid size={{ xs: 12, md: 8 }}>
            {items.map((item) => (
              <Paper key={item.id} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box
                    component="img"
                    src={item.image_url || 'https://via.placeholder.com/100'}
                    alt={item.name}
                    sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 1, cursor: 'pointer' }}
                    onClick={() => navigate(`/products/${item.product_id}`)}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                      onClick={() => navigate(`/products/${item.product_id}`)}
                    >
                      {item.name}
                    </Typography>
                    <Typography variant="body1" color="primary" sx={{ fontWeight: 600 }}>
                      ${item.price.toFixed(2)}
                    </Typography>
                    {/* Quantity increment/decrement controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Remove />
                      </IconButton>
                      <TextField
                        size="small"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateQuantity(item.id, Math.max(1, Math.min(item.stock_quantity, val)));
                        }}
                        inputProps={{ min: 1, max: item.stock_quantity, style: { textAlign: 'center', width: 40 } }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock_quantity}
                      >
                        <Add />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Typography>
                    <IconButton color="error" onClick={() => removeItem(item.id)}>
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            ))}
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')} sx={{ mt: 1 }}>
              Continue Shopping
            </Button>
          </Grid>

          {/* Order summary sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Order Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Items ({summary.itemCount})</Typography>
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
                variant="contained"
                fullWidth
                size="large"
                startIcon={<ShoppingCartCheckout />}
                onClick={() => navigate('/checkout')}
              >
                Proceed to Checkout
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
