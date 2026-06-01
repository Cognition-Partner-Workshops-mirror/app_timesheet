/**
 * Registration page with role selection (customer or business).
 * Business registration shows extra fields for business name and description.
 * Business accounts require admin approval before listing services.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Paper, TextField, Button, Typography, Alert, Box,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '', password: '', name: '', phone: '',
    role: 'customer' as 'customer' | 'business',
    business_name: '', business_description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" textAlign="center" gutterBottom fontWeight="bold" color="primary">
          Create Account
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Role selection toggle */}
          <Typography variant="subtitle2" mb={1}>I want to:</Typography>
          <ToggleButtonGroup
            fullWidth exclusive value={formData.role}
            onChange={(_, val) => val && updateField('role', val)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="customer">
              <PersonIcon sx={{ mr: 1 }} /> Find Services
            </ToggleButton>
            <ToggleButton value="business">
              <BusinessIcon sx={{ mr: 1 }} /> Offer Services
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            fullWidth label="Full Name" margin="normal" required
            value={formData.name} onChange={(e) => updateField('name', e.target.value)}
          />
          <TextField
            fullWidth label="Email" type="email" margin="normal" required
            value={formData.email} onChange={(e) => updateField('email', e.target.value)}
          />
          <TextField
            fullWidth label="Password" type="password" margin="normal" required
            helperText="Minimum 6 characters"
            value={formData.password} onChange={(e) => updateField('password', e.target.value)}
          />
          <TextField
            fullWidth label="Phone (optional)" margin="normal"
            value={formData.phone} onChange={(e) => updateField('phone', e.target.value)}
          />

          {/* Business-specific fields shown only for business role */}
          {formData.role === 'business' && (
            <>
              <TextField
                fullWidth label="Business Name" margin="normal" required
                value={formData.business_name} onChange={(e) => updateField('business_name', e.target.value)}
              />
              <TextField
                fullWidth label="Business Description" margin="normal" multiline rows={3}
                value={formData.business_description} onChange={(e) => updateField('business_description', e.target.value)}
              />
              <Alert severity="info" sx={{ mt: 1 }}>
                Business accounts require admin approval before you can list services.
              </Alert>
            </>
          )}

          <Button
            fullWidth variant="contained" type="submit" size="large"
            sx={{ mt: 2 }} disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Box>

        <Typography textAlign="center" mt={2}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1976d2' }}>Sign in</Link>
        </Typography>
      </Paper>
    </Container>
  );
}
