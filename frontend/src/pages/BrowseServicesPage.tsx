/**
 * Browse Services page - public service listing grouped by category sections.
 * Each category (Mandapalu, Function Halls, Stage Decorations, etc.) is shown
 * as a section with service cards displaying images, company name, organizer
 * name, phone number, pricing, and location. Includes location-based search
 * and sorting. Currency is formatted based on user's region.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid, Card, CardContent, CardActions, Typography,
  TextField, MenuItem, Button, Box, Chip, Rating, InputAdornment,
  CircularProgress, Alert, Paper, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import SortIcon from '@mui/icons-material/Sort';
import apiClient from '../api/client';
import { formatPriceRange } from '../utils/currency';
import type { Service, ServiceCategory } from '../types/api';

// Sort options for location-based sorting
type SortOption = 'default' | 'price_low' | 'price_high' | 'rating' | 'city_asc' | 'city_desc';

export default function BrowseServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Filter and sort state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');
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
    // Debounce search input by 300ms
    const timeout = setTimeout(fetchServices, 300);
    return () => clearTimeout(timeout);
  }, [search, categoryFilter, cityFilter]);

  // Sort services based on selected option
  const sortedServices = useMemo(() => {
    const sorted = [...services];
    switch (sortBy) {
      case 'price_low':
        return sorted.sort((a, b) => a.price_min - b.price_min);
      case 'price_high':
        return sorted.sort((a, b) => b.price_min - a.price_min);
      case 'rating':
        return sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
      case 'city_asc':
        return sorted.sort((a, b) => (a.city || '').localeCompare(b.city || ''));
      case 'city_desc':
        return sorted.sort((a, b) => (b.city || '').localeCompare(a.city || ''));
      default:
        return sorted;
    }
  }, [services, sortBy]);

  // Group services by category for section-based display
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, { category: ServiceCategory | null; services: Service[] }> = {};
    for (const service of sortedServices) {
      const catId = service.category_id;
      if (!grouped[catId]) {
        const cat = categories.find(c => c.id === catId) || null;
        grouped[catId] = { category: cat, services: [] };
      }
      grouped[catId].services.push(service);
    }
    // Return categories in the order they appear in the categories list
    const ordered: { category: ServiceCategory | null; services: Service[] }[] = [];
    for (const cat of categories) {
      if (grouped[cat.id]) {
        ordered.push(grouped[cat.id]);
      }
    }
    // Add any remaining that didn't match known categories
    for (const key of Object.keys(grouped)) {
      if (!categories.find(c => c.id === key)) {
        ordered.push(grouped[key]);
      }
    }
    return ordered;
  }, [sortedServices, categories]);

  // Extract unique cities for the city filter dropdown
  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    services.forEach(s => { if (s.city) cities.add(s.city); });
    return Array.from(cities).sort();
  }, [services]);

  return (
    <Box>
      {/* Hero section */}
      <Paper
        elevation={0}
        sx={{
          p: 4, mb: 3, borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white', textAlign: 'center'
        }}
      >
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Find Event Services Near You
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 2 }}>
          Mandapalu, Function Halls, Stage Decorations, Catering, Photography & more
        </Typography>
      </Paper>

      {/* Search and filter bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Search services..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ minWidth: 250, flex: 1 }}
        />
        <TextField
          select label="Category" size="small" value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Categories</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</MenuItem>
          ))}
        </TextField>
        {/* Location-based city filter dropdown */}
        <TextField
          select label="City / Location" size="small" value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><LocationOnIcon /></InputAdornment> }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All Cities</MenuItem>
          {uniqueCities.map((city) => (
            <MenuItem key={city} value={city}>{city}</MenuItem>
          ))}
        </TextField>
        {/* Sort dropdown for location-based and other sorting */}
        <TextField
          select label="Sort By" size="small" value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SortIcon /></InputAdornment> }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="default">Newest First</MenuItem>
          <MenuItem value="price_low">Price: Low to High</MenuItem>
          <MenuItem value="price_high">Price: High to Low</MenuItem>
          <MenuItem value="rating">Highest Rated</MenuItem>
          <MenuItem value="city_asc">City: A to Z</MenuItem>
          <MenuItem value="city_desc">City: Z to A</MenuItem>
        </TextField>
      </Box>

      {/* Category chips for quick filtering */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          label="All"
          color={categoryFilter === '' ? 'primary' : 'default'}
          onClick={() => setCategoryFilter('')}
          variant={categoryFilter === '' ? 'filled' : 'outlined'}
        />
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={`${cat.icon} ${cat.name}`}
            color={categoryFilter === cat.id ? 'primary' : 'default'}
            onClick={() => setCategoryFilter(cat.id === categoryFilter ? '' : cat.id)}
            variant={categoryFilter === cat.id ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : sortedServices.length === 0 ? (
        <Alert severity="info">No services found. Try adjusting your filters.</Alert>
      ) : (
        // Render services grouped by category sections
        servicesByCategory.map(({ category, services: catServices }) => (
          <Box key={category?.id || 'unknown'} sx={{ mb: 4 }}>
            {/* Category section header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h3">{category?.icon || '📦'}</Typography>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {category?.name || 'Other Services'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {category?.description || ''} &middot; {catServices.length} service{catServices.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {/* Service cards grid for this category */}
            <Grid container spacing={3}>
              {catServices.map((service) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.id}>
                  <Card sx={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { boxShadow: 8, transform: 'translateY(-4px)' }
                  }}>
                    {/* Service image */}
                    <Box
                      sx={{
                        height: 180, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: service.image_url
                          ? `url(${service.image_url}) center/cover`
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        position: 'relative',
                      }}
                    >
                      {!service.image_url && (
                        <Typography variant="h2" color="white">{service.category_icon}</Typography>
                      )}
                      {/* Rating badge overlaid on image */}
                      {(service.avg_rating || 0) > 0 && (
                        <Chip
                          label={`★ ${Number(service.avg_rating).toFixed(1)}`}
                          size="small"
                          sx={{
                            position: 'absolute', top: 8, right: 8,
                            bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 'bold'
                          }}
                        />
                      )}
                    </Box>

                    <CardContent sx={{ flex: 1, pb: 1 }}>
                      {/* Service name */}
                      <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                        {service.name}
                      </Typography>

                      {/* Company name with icon */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <BusinessIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="body2" fontWeight="bold" color="primary.main">
                          {service.business_name || 'N/A'}
                        </Typography>
                      </Box>

                      {/* Organizer/owner name */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {service.business_owner_name || 'N/A'}
                        </Typography>
                      </Box>

                      {/* Phone number */}
                      {service.business_phone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {service.business_phone}
                          </Typography>
                        </Box>
                      )}

                      {/* Location with city */}
                      {service.city && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <LocationOnIcon sx={{ fontSize: 16, color: 'error.main' }} />
                          <Typography variant="body2" color="text.secondary">
                            {service.location ? `${service.location}` : service.city}
                          </Typography>
                        </Box>
                      )}

                      {/* Rating stars */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <Rating value={service.avg_rating || 0} readOnly size="small" precision={0.5} />
                        <Typography variant="body2" color="text.secondary">
                          ({service.review_count || 0})
                        </Typography>
                      </Box>

                      {/* Region-based currency price */}
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        {formatPriceRange(service.price_min, service.price_max)}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        variant="contained" fullWidth size="small"
                        onClick={() => navigate(`/services/${service.id}`)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}
    </Box>
  );
}
