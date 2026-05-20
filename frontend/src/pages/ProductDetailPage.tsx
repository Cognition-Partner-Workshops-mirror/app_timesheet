import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Grid, Box, Button, Chip, TextField, CircularProgress,
  Alert, Breadcrumbs, Link, Paper, Divider
} from '@mui/material';
import { ShoppingCart, ArrowBack } from '@mui/icons-material';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { Product } from '../types/api';

// Detailed product view with image, description, stock info, and add-to-cart
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedToCart, setAddedToCart] = useState(false);

  // Load product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await apiClient.get(`/products/${id}`);
        setProduct(response.data.product);
      } catch {
        setError('Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // Add selected quantity to cart
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await apiClient.post('/cart', { product_id: product?.id, quantity });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !product) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error || 'Product not found'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')} sx={{ mt: 2 }}>
          Back to Products
        </Button>
      </Container>
    );
  }

  const inStock = product.stock_quantity > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumb navigation */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link underline="hover" color="inherit" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          Home
        </Link>
        <Link underline="hover" color="inherit" href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }}>
          Products
        </Link>
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>

      {addedToCart && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Item added to cart! <Link href="/cart" onClick={(e) => { e.preventDefault(); navigate('/cart'); }}>View Cart</Link>
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: { xs: 2, md: 4 } }}>
        <Grid container spacing={4}>
          {/* Product image */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              component="img"
              src={product.image_url || 'https://via.placeholder.com/600x400?text=No+Image'}
              alt={product.name}
              sx={{ width: '100%', borderRadius: 2, objectFit: 'cover', maxHeight: 500 }}
            />
          </Grid>

          {/* Product details and purchase controls */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {product.category_name && (
                <Chip label={product.category_name} variant="outlined" size="small" />
              )}
              {product.featured === 1 && <Chip label="Featured" color="primary" size="small" />}
            </Box>

            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
              {product.name}
            </Typography>

            <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 3 }}>
              ${product.price.toFixed(2)}
            </Typography>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.8 }}>
              {product.description}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Chip
                label={inStock ? `In Stock (${product.stock_quantity} available)` : 'Out of Stock'}
                color={inStock ? 'success' : 'error'}
              />
            </Box>

            {inStock && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <TextField
                  type="number"
                  label="Quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock_quantity, parseInt(e.target.value) || 1)))}
                  inputProps={{ min: 1, max: product.stock_quantity }}
                  size="small"
                  sx={{ width: 100 }}
                />
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<ShoppingCart />}
                  onClick={handleAddToCart}
                  sx={{ px: 4 }}
                >
                  Add to Cart
                </Button>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary">
              Added on {new Date(product.created_at).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}
