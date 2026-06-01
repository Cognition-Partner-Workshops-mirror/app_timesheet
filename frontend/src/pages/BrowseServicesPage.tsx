/**
 * Browse Services page - public service listing with category/city/search filters.
 * Shows service cards with ratings, pricing, and category info.
 * Used by all roles to discover available event services.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, CardActions, Typography,
  TextField, MenuItem, Button, Box, Chip, Rating, InputAdornment,
  CircularProgress, Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import apiClient from '../api/client';
import type { Service, ServiceCategory } from '../types/api';

export default function BrowseServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const navigate = useNavigate();

  // Load categories on mount
  useEffect(() => {
    apiClient.getServiceCategories().then((res) => setCategories(res.categories)).catch(() => {});
  }, []);

  // Fetch services whenever filters change
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (search) params.search = search;
        if (categoryFilter) params.category = categoryFilter;
        if (cityFilter) params.city = cityFilter;
        const res = await apiClient.getServices(params);
        setServices(res.services);
      } catch {
        setError('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    // Debounce search input
    const timeout = setTimeout(fetchServices, 300);
    return () => clearTimeout(timeout);
  }, [search, categoryFilter, cityFilter]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Browse Event Services
      </Typography>

      {/* Filter bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search services..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 250 }}
        />
        <TextField
          select label="Category" size="small" value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All Categories</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          placeholder="City"
          size="small"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><LocationOnIcon /></InputAdornment> }}
          sx={{ minWidth: 150 }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : services.length === 0 ? (
        <Alert severity="info">No services found. Try adjusting your filters.</Alert>
      ) : (
        <Grid container spacing={3}>
          {services.map((service) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 6 } }}>
                {/* Service image placeholder */}
                <Box
                  sx={{
                    height: 160, bgcolor: 'primary.light', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: service.image_url
                      ? `url(${service.image_url}) center/cover`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  {!service.image_url && (
                    <Typography variant="h2" color="white">{service.category_icon}</Typography>
                  )}
                </Box>

                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="h6" fontWeight="bold" noWrap sx={{ flex: 1 }}>
                      {service.name}
                    </Typography>
                  </Box>

                  <Chip
                    label={service.category_name}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 40 }}>
                    {service.description?.substring(0, 100) || 'No description'}
                    {(service.description?.length ?? 0) > 100 ? '...' : ''}
                  </Typography>

                  {service.city && (
                    <Typography variant="body2" color="text.secondary">
                      <LocationOnIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      {service.city}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Rating value={service.avg_rating || 0} readOnly size="small" precision={0.5} />
                    <Typography variant="body2" color="text.secondary">
                      ({service.review_count || 0})
                    </Typography>
                  </Box>

                  <Typography variant="h6" color="primary" mt={1}>
                    ${service.price_min.toLocaleString()}
                    {service.price_max ? ` - $${service.price_max.toLocaleString()}` : '+'}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button size="small" onClick={() => navigate(`/services/${service.id}`)}>
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
