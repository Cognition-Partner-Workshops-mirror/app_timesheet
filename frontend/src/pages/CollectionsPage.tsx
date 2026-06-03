import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Skeleton,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import apiClient from '../api/client';
import type { Collection, CreateCollectionRequest } from '../types/api';

// Preset colors for collections
const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#6b7280',
];

/**
 * Collections management page.
 * Users can create, edit, and delete collections to organize their files.
 */
const CollectionsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');
  const [deleteDialogId, setDeleteDialogId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch all collections
  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => apiClient.getCollections(),
  });

  // Create or update collection
  const saveMutation = useMutation({
    mutationFn: (data: CreateCollectionRequest & { id?: number }) => {
      if (data.id) {
        return apiClient.updateCollection(data.id, { name: data.name, description: data.description, color: data.color });
      }
      return apiClient.createCollection(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setSnackbar({ open: true, message: editingCollection ? 'Collection updated' : 'Collection created', severity: 'success' });
      closeDialog();
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to save collection', severity: 'error' });
    },
  });

  // Delete collection
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setSnackbar({ open: true, message: 'Collection deleted', severity: 'success' });
      setDeleteDialogId(null);
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to delete collection', severity: 'error' });
    },
  });

  const openCreateDialog = () => {
    setEditingCollection(null);
    setFormName('');
    setFormDescription('');
    setFormColor('#6366f1');
    setDialogOpen(true);
  };

  const openEditDialog = (collection: Collection) => {
    setEditingCollection(collection);
    setFormName(collection.name);
    setFormDescription(collection.description);
    setFormColor(collection.color);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCollection(null);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    saveMutation.mutate({
      id: editingCollection?.id,
      name: formName.trim(),
      description: formDescription.trim(),
      color: formColor,
    });
  };

  return (
    <Box>
      {/* Header with create button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Collections
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
            },
          }}
        >
          New Collection
        </Button>
      </Box>

      {/* Loading state */}
      {isLoading && (
        <Grid container spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!isLoading && collections?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <FolderIcon sx={{ fontSize: 80, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6">No collections yet</Typography>
          <Typography variant="body2">Create a collection to organize your files</Typography>
        </Box>
      )}

      {/* Collection cards */}
      <Grid container spacing={2}>
        {collections?.map((collection) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={collection.id}>
            <Card
              sx={{
                borderRadius: 3,
                borderTop: `4px solid ${collection.color}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <FolderIcon sx={{ color: collection.color, fontSize: 32 }} />
                  <Typography variant="h6" fontWeight={600}>
                    {collection.name}
                  </Typography>
                </Box>
                {collection.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {collection.description}
                  </Typography>
                )}
                <Chip
                  icon={<InsertDriveFileIcon />}
                  label={`${collection.file_count} file${collection.file_count !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                />
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <IconButton size="small" onClick={() => openEditDialog(collection)}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => setDeleteDialogId(collection.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCollection ? 'Edit Collection' : 'New Collection'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Collection Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            autoFocus
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map((color) => (
              <Box
                key={color}
                onClick={() => setFormColor(color)}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: color,
                  cursor: 'pointer',
                  border: formColor === color ? '3px solid #1a1a2e' : '3px solid transparent',
                  transition: 'border-color 0.2s',
                  '&:hover': { opacity: 0.8 },
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formName.trim()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)' },
            }}
          >
            {editingCollection ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteDialogId} onClose={() => setDeleteDialogId(null)}>
        <DialogTitle>Delete Collection</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure? Files in this collection will not be deleted, but they will be unassigned.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogId(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteDialogId && deleteMutation.mutate(deleteDialogId)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CollectionsPage;
