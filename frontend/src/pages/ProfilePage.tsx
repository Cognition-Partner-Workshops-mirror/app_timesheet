/**
 * User profile page - allows all users to view and update their profile.
 * Business users can also see their business info.
 */

import { useState } from 'react';
import {
  Container, Paper, Typography, TextField, Button, Box, Alert,
  Avatar, Chip, Divider
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

// Role chip colors for display
const roleColors: Record<string, 'error' | 'warning' | 'success'> = {
  admin: 'error',
  business: 'warning',
  customer: 'success',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    business_name: user?.business_name || '',
    business_description: user?.business_description || '',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await apiClient.updateProfile(formData);
      await refreshUser();
      setSuccess('Profile updated successfully!');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4 }}>
        {/* Profile header with avatar */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 1, bgcolor: 'primary.main', fontSize: 32 }}>
            {user.name.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h5" fontWeight="bold">{user.name}</Typography>
          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
          <Chip
            label={user.role}
            color={roleColors[user.role] || 'default'}
            size="small"
            sx={{ mt: 1 }}
          />
          {user.role === 'business' && (
            <Chip
              label={user.is_approved ? 'Approved' : 'Pending Approval'}
              color={user.is_approved ? 'success' : 'warning'}
              size="small"
              variant="outlined"
              sx={{ mt: 1, ml: 1 }}
            />
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Profile edit form */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth label="Full Name" margin="normal" required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            fullWidth label="Email" margin="normal" disabled
            value={user.email}
            helperText="Email cannot be changed"
          />
          <TextField
            fullWidth label="Phone" margin="normal"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          {/* Business-specific fields */}
          {user.role === 'business' && (
            <>
              <TextField
                fullWidth label="Business Name" margin="normal"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              />
              <TextField
                fullWidth label="Business Description" margin="normal" multiline rows={3}
                value={formData.business_description}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
              />
            </>
          )}

          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Member since: {new Date(user.created_at).toLocaleDateString()}
          </Typography>

          <Button
            fullWidth variant="contained" type="submit" size="large"
            sx={{ mt: 3 }} disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
