import React, { useState, useRef } from 'react';
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
  Chip,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DocIcon,
  TableChart as SpreadsheetIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import { type FileItem } from '../types/api';

// Helper to format file size in human-readable form
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper to get icon based on mime type
const getFileIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') return <PdfIcon color="error" />;
  if (mimeType.startsWith('image/')) return <ImageIcon color="primary" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return <SpreadsheetIcon color="success" />;
  if (mimeType.includes('document') || mimeType.includes('msword') || mimeType === 'text/plain') return <DocIcon color="info" />;
  return <FileIcon />;
};

// Helper to format date for display
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LibraryPage: React.FC = () => {
  // State for search, filter, and sort
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState('date_desc');

  // State for upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

  // State for edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [editForm, setEditForm] = useState({ original_name: '', category: '', description: '' });

  // State for errors
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch files with current filters
  const { data: filesData, isLoading } = useQuery({
    queryKey: ['files', search, categoryFilter, sort],
    queryFn: () => apiClient.getFiles({
      search: search || undefined,
      category: categoryFilter || undefined,
      sort: sort || undefined,
    }),
  });

  // Fetch categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['fileCategories'],
    queryFn: () => apiClient.getFileCategories(),
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, category, description }: { file: File; category?: string; description?: string }) =>
      apiClient.uploadFile(file, category, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
      handleUploadClose();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to upload file');
      setUploadProgress(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { category?: string; description?: string; original_name?: string } }) =>
      apiClient.updateFile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
      handleEditClose();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update file');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete file');
    },
  });

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => apiClient.deleteAllFiles(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['fileCategories'] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete all files');
    },
  });

  const files: FileItem[] = filesData?.files || [];
  const categories: string[] = categoriesData?.categories || [];

  // Upload dialog handlers
  const handleUploadOpen = () => {
    setUploadOpen(true);
    setUploadFile(null);
    setUploadCategory('');
    setUploadDescription('');
    setError('');
  };

  const handleUploadClose = () => {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadCategory('');
    setUploadDescription('');
    setUploadProgress(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setUploadFile(selectedFile);
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadFile) {
      setError('Please select a file to upload');
      return;
    }
    setError('');
    setUploadProgress(true);
    uploadMutation.mutate({
      file: uploadFile,
      category: uploadCategory || undefined,
      description: uploadDescription || undefined,
    });
  };

  // Edit dialog handlers
  const handleEditOpen = (file: FileItem) => {
    setEditingFile(file);
    setEditForm({
      original_name: file.original_name,
      category: file.category || '',
      description: file.description || '',
    });
    setEditOpen(true);
    setError('');
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingFile(null);
  };

  const handleEditSubmit = () => {
    if (!editingFile) return;
    updateMutation.mutate({
      id: editingFile.id,
      data: {
        original_name: editForm.original_name || undefined,
        category: editForm.category || undefined,
        description: editForm.description || undefined,
      },
    });
  };

  // Download handler
  const handleDownload = async (file: FileItem) => {
    try {
      const response = await apiClient.downloadFile(file.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.original_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download file');
    }
  };

  // Delete handler with confirmation
  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteMutation.mutate(id);
    }
  };

  // Delete all handler with confirmation
  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete ALL files? This cannot be undone.')) {
      deleteAllMutation.mutate();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Document Library
        </Typography>
        <Stack direction="row" spacing={1}>
          {files.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon />}
              onClick={handleDeleteAll}
            >
              Delete All
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handleUploadOpen}
          >
            Upload File
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sort}
              label="Sort By"
              onChange={(e) => setSort(e.target.value)}
            >
              <MenuItem value="date_desc">Newest First</MenuItem>
              <MenuItem value="date_asc">Oldest First</MenuItem>
              <MenuItem value="name_asc">Name A-Z</MenuItem>
              <MenuItem value="name_desc">Name Z-A</MenuItem>
              <MenuItem value="size_desc">Largest First</MenuItem>
              <MenuItem value="size_asc">Smallest First</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Files Table */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : files.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FileIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No files uploaded yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload your first file to get started
          </Typography>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={handleUploadOpen}>
            Upload File
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getFileIcon(file.mime_type)}
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {file.original_name}
                        </Typography>
                        {file.description && (
                          <Typography variant="caption" color="text.secondary">
                            {file.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {file.category ? (
                      <Chip label={file.category} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatFileSize(file.file_size)}</TableCell>
                  <TableCell>{formatDate(file.created_at)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={() => handleDownload(file)} color="primary">
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => handleEditOpen(file)} color="info">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDelete(file.id)} color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onClose={handleUploadClose} maxWidth="sm" fullWidth>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.zip"
            />
            <Button
              variant="outlined"
              fullWidth
              onClick={() => fileInputRef.current?.click()}
              sx={{ mb: 2, py: 2 }}
            >
              {uploadFile ? uploadFile.name : 'Click to select a file'}
            </Button>
            {uploadFile && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Size: {formatFileSize(uploadFile.size)} | Type: {uploadFile.type || 'unknown'}
              </Typography>
            )}
            <TextField
              fullWidth
              label="Category (optional)"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              placeholder="e.g., Invoices, Contracts, Reports"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description (optional)"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Brief description of the file"
              multiline
              rows={2}
            />
            {uploadProgress && <LinearProgress sx={{ mt: 2 }} />}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUploadClose}>Cancel</Button>
          <Button
            onClick={handleUploadSubmit}
            variant="contained"
            disabled={!uploadFile || uploadProgress}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit File Details</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="File Name"
              value={editForm.original_name}
              onChange={(e) => setEditForm({ ...editForm, original_name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Category"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              placeholder="e.g., Invoices, Contracts, Reports"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Brief description of the file"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LibraryPage;
