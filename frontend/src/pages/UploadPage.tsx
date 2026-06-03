import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Paper,
  LinearProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import apiClient from '../api/client';

/** Human-readable file size */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Upload page with drag-and-drop zone and upload progress.
 * Users can select a target collection and add tags before uploading.
 */
const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [collectionId, setCollectionId] = useState<number | ''>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch collections for the dropdown
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => apiClient.getCollections(),
  });

  // Add files from file picker or drag-drop
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const unique = fileArray.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  // Add a tag when Enter is pressed
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  // Upload all selected files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);

    try {
      await apiClient.uploadFiles(
        selectedFiles,
        collectionId || null,
        tags.length > 0 ? tags : undefined,
        (percent) => setProgress(percent)
      );

      // Invalidate caches so library page refreshes
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });

      setSnackbar({
        open: true,
        message: `${selectedFiles.length} file(s) uploaded successfully!`,
        severity: 'success',
      });

      // Navigate to library after short delay
      setTimeout(() => navigate('/library'), 1200);
    } catch {
      setSnackbar({ open: true, message: 'Upload failed. Please try again.', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Upload Files
      </Typography>

      {/* Drag-and-drop zone */}
      <Paper
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          p: 6,
          borderRadius: 4,
          border: '2px dashed',
          borderColor: isDragOver ? 'primary.main' : 'grey.300',
          bgcolor: isDragOver ? 'primary.50' : 'grey.50',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.light',
            bgcolor: 'primary.50',
          },
        }}
      >
        <FileUploadIcon sx={{ fontSize: 64, color: isDragOver ? 'primary.main' : 'grey.400', mb: 2 }} />
        <Typography variant="h6" color={isDragOver ? 'primary' : 'text.secondary'}>
          {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          or click to browse · Saved to your local library · Max 50MB per file
        </Typography>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept="image/*,.pdf,.epub,.doc,.docx,.txt,.rtf,.xls,.xlsx,.ppt,.pptx"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </Paper>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <Paper sx={{ mt: 3, borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 2, pt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {selectedFiles.length} file(s) selected · {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))} total
            </Typography>
          </Box>
          <List dense>
            {selectedFiles.map((file, index) => (
              <ListItem key={`${file.name}-${file.size}`}>
                <ListItemIcon>
                  <InsertDriveFileIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={formatFileSize(file.size)}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => removeFile(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Upload options: collection and tags */}
      {selectedFiles.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Collection (optional)</InputLabel>
            <Select
              value={collectionId}
              label="Collection (optional)"
              onChange={(e) => setCollectionId(e.target.value as number | '')}
            >
              <MenuItem value="">None</MenuItem>
              {collections?.map((col) => (
                <MenuItem key={col.id} value={col.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: col.color }} />
                    {col.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Tags input */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              Tags (press Enter to add)
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => setTags(tags.filter((t) => t !== tag))}
                />
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag…"
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.875rem',
                  padding: '4px 8px',
                  minWidth: 80,
                  background: 'transparent',
                }}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <Box sx={{ mt: 3 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Uploading… {progress}%
          </Typography>
        </Box>
      )}

      {/* Upload button */}
      {selectedFiles.length > 0 && !uploading && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<CheckCircleIcon />}
            onClick={handleUpload}
            sx={{
              px: 6,
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
              },
            }}
          >
            Upload {selectedFiles.length} file(s)
          </Button>
        </Box>
      )}

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

export default UploadPage;
