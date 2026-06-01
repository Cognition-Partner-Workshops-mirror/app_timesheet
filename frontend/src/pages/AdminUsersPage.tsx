/**
 * Admin user management page.
 * Lists all platform users with filtering by role and approval status.
 * Allows approving/rejecting business accounts, changing roles, and deleting users.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, Box,
  CircularProgress, Alert, TextField, MenuItem, IconButton
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../api/client';
import type { User } from '../types/api';

// Role chip colors
const roleColors: Record<string, 'error' | 'warning' | 'success'> = {
  admin: 'error',
  business: 'warning',
  customer: 'success',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (roleFilter) params.role = roleFilter;
      const res = await apiClient.getAdminUsers(params);
      setUsers(res.users);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Approve or reject a business user
  const handleApproval = async (id: string, approved: boolean) => {
    try {
      await apiClient.approveUser(id, approved);
      fetchUsers();
    } catch {
      setError('Failed to update approval status');
    }
  };

  // Delete a user with confirmation
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? All their data will be removed.')) return;
    try {
      await apiClient.deleteUser(id);
      fetchUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to delete user');
    }
  };

  if (loading) {
    return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom fontWeight="bold">Manage Users</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Role filter */}
      <Box sx={{ mb: 3 }}>
        <TextField
          select label="Filter by Role" size="small" value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)} sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All Roles</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="business">Business</MenuItem>
          <MenuItem value="customer">Customer</MenuItem>
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Role</strong></TableCell>
              <TableCell><strong>Business</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Joined</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip label={user.role} size="small" color={roleColors[user.role] || 'default'} />
                </TableCell>
                <TableCell>{user.business_name || '-'}</TableCell>
                <TableCell>
                  {user.role === 'business' ? (
                    <Chip
                      label={user.is_approved ? 'Approved' : 'Pending'}
                      size="small"
                      color={user.is_approved ? 'success' : 'warning'}
                    />
                  ) : (
                    <Chip label="Active" size="small" color="success" />
                  )}
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {/* Approve/reject buttons for pending business users */}
                    {user.role === 'business' && !user.is_approved && (
                      <>
                        <IconButton size="small" color="success" title="Approve" onClick={() => handleApproval(user.id, true)}>
                          <CheckCircleIcon />
                        </IconButton>
                        <IconButton size="small" color="error" title="Reject" onClick={() => handleApproval(user.id, false)}>
                          <CancelIcon />
                        </IconButton>
                      </>
                    )}
                    {user.role === 'business' && user.is_approved === 1 && (
                      <Button size="small" color="warning" onClick={() => handleApproval(user.id, false)}>
                        Revoke
                      </Button>
                    )}
                    <IconButton size="small" color="error" title="Delete user" onClick={() => handleDelete(user.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
