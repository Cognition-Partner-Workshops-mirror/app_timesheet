/**
 * Admin services oversight page.
 * Shows all services across the platform with business owner info.
 * Allows admin to delete any service.
 */

import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Box,
  CircularProgress, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../api/client';
import type { Service } from '../types/api';

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchServices = async () => {
    try {
      const res = await apiClient.getAdminServices();
      setServices(res.services);
    } catch {
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  // Admin can delete any service
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    try {
      await apiClient.deleteService(id);
      fetchServices();
    } catch {
      setError('Failed to delete service');
    }
  };

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom fontWeight="bold">All Services</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Service Name</strong></TableCell>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>Business Owner</strong></TableCell>
              <TableCell><strong>Price</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{service.name}</TableCell>
                <TableCell>
                  <Chip label={service.category_name} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{service.business_name || service.business_owner_name}</TableCell>
                <TableCell>
                  ${service.price_min.toLocaleString()}
                  {service.price_max ? ` - $${service.price_max.toLocaleString()}` : '+'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={service.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={service.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="error" onClick={() => handleDelete(service.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
