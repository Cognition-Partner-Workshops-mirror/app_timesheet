import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import apiClient from '../api/client';
import { type WorkEntry } from '../types/api';
import { bankingColors } from '../theme';

const WorkEntriesPage: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkEntry | null>(null);
  const [formData, setFormData] = useState({
    clientId: 0,
    hours: '',
    description: '',
    date: new Date(),
  });
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const { data: workEntriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['workEntries'],
    queryFn: () => apiClient.getWorkEntries(),
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const createMutation = useMutation({
    mutationFn: (entryData: { clientId: number; hours: number; description?: string; date: string }) =>
      apiClient.createWorkEntry(entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
      handleClose();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create work entry');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { clientId?: number; hours?: number; description?: string; date?: string } }) =>
      apiClient.updateWorkEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
      handleClose();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update work entry');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteWorkEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workEntries'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete work entry');
    },
  });

  const workEntries = workEntriesData?.workEntries || [];
  const clients = clientsData?.clients || [];

  const handleOpen = (entry?: WorkEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        clientId: entry.client_id,
        hours: entry.hours.toString(),
        description: entry.description || '',
        date: new Date(entry.date),
      });
    } else {
      setEditingEntry(null);
      setFormData({
        clientId: 0,
        hours: '',
        description: '',
        date: new Date(),
      });
    }
    setError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingEntry(null);
    setFormData({
      clientId: 0,
      hours: '',
      description: '',
      date: new Date(),
    });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.clientId) {
      setError('Please select a client');
      return;
    }

    const hours = parseFloat(formData.hours);
    if (!hours || hours <= 0 || hours > 24) {
      setError('Hours must be between 0 and 24');
      return;
    }

    if (!formData.date) {
      setError('Please select a date');
      return;
    }

    const entryData = {
      clientId: formData.clientId,
      hours,
      description: formData.description || undefined,
      date: formData.date.toISOString().split('T')[0],
    };

    if (editingEntry) {
      updateMutation.mutate({
        id: editingEntry.id,
        data: entryData,
      });
    } else {
      createMutation.mutate(entryData);
    }
  };

  const handleDelete = (entry: WorkEntry) => {
    if (window.confirm(`Are you sure you want to delete this ${entry.hours} hour entry for ${entry.client_name}?`)) {
      deleteMutation.mutate(entry.id);
    }
  };

  if (entriesLoading || clientsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: bankingColors.teal }} />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: bankingColors.navy }}>Work Entries</Typography>
            <Typography variant="body2" sx={{ color: bankingColors.textSecondary }}>
              Track billable hours across your clients
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Add Work Entry
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {clients.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
            <AssignmentIcon sx={{ fontSize: 48, color: alpha(bankingColors.navy, 0.12), mb: 1.5 }} />
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              You need to create at least one client before adding work entries.
            </Typography>
            <Button variant="contained" href="/clients">
              Create Client
            </Button>
          </Paper>
        ) : (
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Hours</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workEntries.length > 0 ? (
                    workEntries.map((entry: WorkEntry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: bankingColors.navy }}>
                            {entry.client_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(entry.date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${entry.hours}h`}
                            size="small"
                            sx={{
                              background: alpha(bankingColors.teal, 0.1),
                              color: bankingColors.tealDark,
                              fontWeight: 700,
                              border: `1px solid ${alpha(bankingColors.teal, 0.2)}`,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {entry.description ? (
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {entry.description}
                            </Typography>
                          ) : (
                            <Typography variant="body2" sx={{ color: alpha(bankingColors.textSecondary, 0.5) }}>--</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            onClick={() => handleOpen(entry)}
                            size="small"
                            sx={{ color: bankingColors.accentBlue }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDelete(entry)}
                            size="small"
                            sx={{ color: bankingColors.error }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Box sx={{ py: 5 }}>
                          <AssignmentIcon sx={{ fontSize: 48, color: alpha(bankingColors.navy, 0.12), mb: 1.5 }} />
                          <Typography color="text.secondary">
                            No work entries found. Add your first work entry to get started.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: bankingColors.navy }}>
            {editingEntry ? 'Edit Work Entry' : 'Add New Work Entry'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <FormControl fullWidth margin="dense" required>
                <InputLabel>Client</InputLabel>
                <Select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: Number(e.target.value) })}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {clients.map((client: { id: number; name: string }) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                margin="dense"
                label="Hours"
                type="number"
                fullWidth
                required
                inputProps={{ min: 0.01, max: 24, step: 0.01 }}
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                disabled={createMutation.isPending || updateMutation.isPending}
              />

              <DatePicker
                label="Date"
                value={formData.date}
                onChange={(date) => date && setFormData({ ...formData, date })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'dense',
                    required: true,
                    disabled: createMutation.isPending || updateMutation.isPending,
                  },
                }}
              />

              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={createMutation.isPending || updateMutation.isPending}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={handleClose} variant="outlined" disabled={createMutation.isPending || updateMutation.isPending} sx={{ mr: 1 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <CircularProgress size={24} sx={{ color: '#fff' }} />
                ) : (
                  editingEntry ? 'Update' : 'Create'
                )}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default WorkEntriesPage;
