import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Grid, Box, TextField, FormControl, InputLabel, Select, MenuItem,
  Pagination as MuiPagination, CircularProgress, Alert, Chip, InputAdornment
} from '@mui/material';
import { Search } from '@mui/icons-material';
import apiClient from '../api/client';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../hooks/useAuth';
import type { Product, Category, Pagination } from '../types/api';

// Product listing page with search, category filter, sort, and pagination
export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Read filter state from URL query params
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'DESC';
  const page = parseInt(searchParams.get('page') || '1');

  // Fetch products whenever filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page, limit: 12, sort, order };
        if (search) params.search = search;
        if (categoryId) params.category_id = categoryId;

        const response = await apiClient.get('/products', { params });
        setProducts(response.data.products);
        setPagination(response.data.pagination);
      } catch {
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [search, categoryId, sort, order, page]);

  // Load categories once for the filter dropdown
  useEffect(() => {
    apiClient.get('/categories')
      .then(res => setCategories(res.data.categories))
      .catch(() => {});
  }, []);

  // Update URL params to reflect filter changes
  const updateParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== 'page') newParams.set('page', '1');
    setSearchParams(newParams);
  };

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        {categoryId ? categories.find(c => c.id === parseInt(categoryId))?.name || 'Products' : 'All Products'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filters row: search, category, sort */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Search products..."
          value={search}
          onChange={(e) => updateParams('search', e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>
          }}
          sx={{ minWidth: 200, flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select value={categoryId} label="Category" onChange={(e) => updateParams('category', e.target.value)}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map(cat => (
              <MenuItem key={cat.id} value={cat.id.toString()}>{cat.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={`${sort}-${order}`}
            label="Sort By"
            onChange={(e) => {
              const [s, o] = e.target.value.split('-');
              const newParams = new URLSearchParams(searchParams);
              newParams.set('sort', s);
              newParams.set('order', o);
              newParams.set('page', '1');
              setSearchParams(newParams);
            }}
          >
            <MenuItem value="created_at-DESC">Newest First</MenuItem>
            <MenuItem value="created_at-ASC">Oldest First</MenuItem>
            <MenuItem value="price-ASC">Price: Low to High</MenuItem>
            <MenuItem value="price-DESC">Price: High to Low</MenuItem>
            <MenuItem value="name-ASC">Name: A-Z</MenuItem>
            <MenuItem value="name-DESC">Name: Z-A</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Active filter chips */}
      {(search || categoryId) && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {search && <Chip label={`Search: "${search}"`} onDelete={() => updateParams('search', '')} />}
          {categoryId && (
            <Chip
              label={`Category: ${categories.find(c => c.id === parseInt(categoryId))?.name}`}
              onDelete={() => updateParams('category', '')}
            />
          )}
        </Box>
      )}

      {/* Product grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : products.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">No products found</Typography>
          <Typography variant="body2" color="text.secondary">Try adjusting your search or filters</Typography>
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {products.length} of {pagination.total} products
          </Typography>
          <Grid container spacing={3}>
            {products.map(product => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
                <ProductCard product={product} onAddToCart={handleAddToCart} />
              </Grid>
            ))}
          </Grid>

          {/* Pagination controls */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <MuiPagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={(_, value) => updateParams('page', value.toString())}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
