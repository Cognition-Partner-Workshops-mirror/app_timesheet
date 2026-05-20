import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Grid, Button, Card, CardMedia, CardContent, CircularProgress, Alert
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import apiClient from '../api/client';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../hooks/useAuth';
import type { Product, Category } from '../types/api';

// Landing page displaying hero banner, featured products, and category grid
export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load featured products and categories on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          apiClient.get('/products', { params: { featured: 'true', limit: 4 } }),
          apiClient.get('/categories')
        ]);
        setFeaturedProducts(productsRes.data.products);
        setCategories(categoriesRes.data.categories);
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Add product to cart with login guard
  const handleAddToCart = async (productId: number) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      await apiClient.post('/cart', { product_id: productId, quantity: 1 });
      navigate('/cart');
    } catch {
      setError('Failed to add item to cart');
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
    <>
      {/* Hero banner section */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)',
        color: 'white',
        py: { xs: 6, md: 10 },
        textAlign: 'center'
      }}>
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" sx={{ fontWeight: 800, mb: 2, fontSize: { xs: '2rem', md: '3.5rem' } }}>
            Welcome to ShopHub
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, fontSize: { xs: '1rem', md: '1.5rem' } }}>
            Discover amazing products at unbeatable prices
          </Typography>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={() => navigate('/products')}
            sx={{ bgcolor: 'white', color: '#1a237e', '&:hover': { bgcolor: '#e8eaf6' }, px: 4, py: 1.5 }}
          >
            Shop Now
          </Button>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* Featured Products section */}
        {featuredProducts.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
                Featured Products
              </Typography>
              <Button endIcon={<ArrowForward />} onClick={() => navigate('/products')}>
                View All
              </Button>
            </Box>
            <Grid container spacing={3}>
              {featuredProducts.map(product => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={product.id}>
                  <ProductCard product={product} onAddToCart={handleAddToCart} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Shop by Category section */}
        {categories.length > 0 && (
          <Box>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 3 }}>
              Shop by Category
            </Typography>
            <Grid container spacing={3}>
              {categories.map(category => (
                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={category.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'scale(1.05)' },
                      textAlign: 'center'
                    }}
                    onClick={() => navigate(`/products?category=${category.id}`)}
                  >
                    <CardMedia
                      component="img"
                      height="120"
                      image={category.image_url || 'https://via.placeholder.com/200x120'}
                      alt={category.name}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {category.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {category.product_count} products
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Container>
    </>
  );
}
