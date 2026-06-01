/**
 * Service create/edit form page for business users.
 * Handles both creating new services and editing existing ones.
 * Uses the service ID from URL params to determine edit mode.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container, Paper, Typography, TextField, Button, MenuItem, Box,
  Alert, CircularProgress, Grid
} from '@mui/material';
import apiClient from '../api/client';
import type { ServiceCategory } from '../types/api';

export default function ServiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    category_id: '', name: '', description: '',
    price_min: '', price_max: '', location: '', city: '',
    image_url: '', capacity_min: '', capacity_max: ''
  });

  // Load categories + existing service data for edit mode
  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await apiClient.getServiceCategories();
        setCategories(catRes.categories);

        if (isEdit && id) {
          const svcRes = await apiClient.getService(id);
          const s = svcRes.service;
          setFormData({
            category_id: s.category_id,
            name: s.name,
            description: s.description || '',
            price_min: String(s.price_min),
            price_max: s.price_max ? String(s.price_max) : '',
            location: s.location || '',
            city: s.city || '',
            image_url: s.image_url || '',
            capacity_min: s.capacity_min ? String(s.capacity_min) : '',
            capacity_max: s.capacity_max ? String(s.capacity_max) : '',
          });
        }
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const data = {
      category_id: formData.category_id,
      name: formData.name,
      description: formData.description,
      price_min: Number(formData.price_min),
      price_max: formData.price_max ? Number(formData.price_max) : null,
      location: formData.location,
      city: formData.city,
      image_url: formData.image_url,
      capacity_min: formData.capacity_min ? Number(formData.capacity_min) : null,
      capacity_max: formData.capacity_max ? Number(formData.capacity_max) : null,
    };

    try {
      if (isEdit && id) {
        await apiClient.updateService(id, data);
      } else {
        await apiClient.createService(data);
      }
      navigate('/business/services');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to save service');
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          {isEdit ? 'Edit Service' : 'Add New Service'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth select label="Category" margin="normal" required
            value={formData.category_id}
            onChange={(e) => updateField('category_id', e.target.value)}
          >
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth label="Service Name" margin="normal" required
            value={formData.name} onChange={(e) => updateField('name', e.target.value)}
          />
          <TextField
            fullWidth label="Description" margin="normal" multiline rows={4}
            value={formData.description} onChange={(e) => updateField('description', e.target.value)}
          />

          {/* Pricing fields */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth label="Minimum Price ($)" type="number" margin="normal" required
                value={formData.price_min} onChange={(e) => updateField('price_min', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth label="Maximum Price ($)" type="number" margin="normal"
                value={formData.price_max} onChange={(e) => updateField('price_max', e.target.value)}
              />
            </Grid>
          </Grid>

          {/* Location fields */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth label="Location/Address" margin="normal"
                value={formData.location} onChange={(e) => updateField('location', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth label="City" margin="normal"
                value={formData.city} onChange={(e) => updateField('city', e.target.value)}
              />
            </Grid>
          </Grid>

          {/* Capacity fields */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth label="Min Capacity (guests)" type="number" margin="normal"
                value={formData.capacity_min} onChange={(e) => updateField('capacity_min', e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth label="Max Capacity (guests)" type="number" margin="normal"
                value={formData.capacity_max} onChange={(e) => updateField('capacity_max', e.target.value)}
              />
            </Grid>
          </Grid>

          <TextField
            fullWidth label="Image URL" margin="normal"
            placeholder="https://example.com/image.jpg"
            value={formData.image_url} onChange={(e) => updateField('image_url', e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button variant="contained" type="submit" size="large">
              {isEdit ? 'Update Service' : 'Create Service'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/business/services')}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
