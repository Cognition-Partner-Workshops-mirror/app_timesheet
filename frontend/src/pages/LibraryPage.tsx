import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Grid,
  Skeleton,
  Pagination,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import apiClient from '../api/client';
import type { FileQueryParams, LibraryFile, FileType } from '../types/api';

// Maps file types to their display icons
const fileTypeIcons: Record<string, React.ReactElement> = {
  pdf: <PictureAsPdfIcon sx={{ fontSize: 48, color: '#e53935' }} />,
  image: <ImageIcon sx={{ fontSize: 48, color: '#43a047' }} />,
  document: <DescriptionIcon sx={{ fontSize: 48, color: '#1e88e5' }} />,
  ebook: <MenuBookIcon sx={{ fontSize: 48, color: '#8e24aa' }} />,
};

/** Human-readable file size */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Main library page – displays all files with search, sort, filter, and grid/list toggle.
 */
const LibraryPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  // View and filter state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<FileQueryParams['sort_by']>('date');
  const [sortOrder, setSortOrder] = useState<FileQueryParams['sort_order']>('desc');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | FileType>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [deleteDialogFile, setDeleteDialogFile] = useState<LibraryFile | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Build query params from current filter state
  const queryParams: FileQueryParams = {
    sort_by: sortBy,
    sort_order: sortOrder,
    file_type: fileTypeFilter,
    favorites_only: favoritesOnly,
    search: search || undefined,
    page,
    limit: 20,
  };

  // Fetch files with current filters
  const { data, isLoading } = useQuery({
    queryKey: ['files', queryParams],
    queryFn: () => apiClient.getFiles(queryParams),
  });

  // Toggle favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: (id: number) => apiClient.toggleFavorite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setSnackbar({ open: true, message: 'File deleted', severity: 'success' });
      setDeleteDialogFile(null);
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to delete file', severity: 'error' });
    },
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const handleDownload = (file: LibraryFile) => {
    const link = document.createElement('a');
    link.href = apiClient.getDownloadUrl(file.id);
    link.download = file.original_name;
    link.click();
  };

  return (
    <Box>
      {/* Search and filter toolbar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 2,
          mb: 3,
          alignItems: isMobile ? 'stretch' : 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Search input */}
        <TextField
          placeholder="Search files…"
          value={search}
          onChange={handleSearchChange}
          size="small"
          sx={{ flex: 1, minWidth: 200 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Sort controls */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <SortIcon fontSize="small" color="action" />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={sortBy}
              label="Sort"
              onChange={(e) => {
                setSortBy(e.target.value as FileQueryParams['sort_by']);
                setPage(1);
              }}
            >
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="size">Size</MenuItem>
              <MenuItem value="type">Type</MenuItem>
            </Select>
          </FormControl>
          <ToggleButtonGroup
            size="small"
            value={sortOrder}
            exclusive
            onChange={(_, v) => { if (v) { setSortOrder(v); setPage(1); } }}
          >
            <ToggleButton value="desc">↓</ToggleButton>
            <ToggleButton value="asc">↑</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* File type filter chips */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <FilterListIcon fontSize="small" color="action" />
          {(['all', 'image', 'pdf', 'document', 'ebook'] as const).map((type) => (
            <Chip
              key={type}
              label={type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              size="small"
              variant={fileTypeFilter === type ? 'filled' : 'outlined'}
              color={fileTypeFilter === type ? 'primary' : 'default'}
              onClick={() => { setFileTypeFilter(type); setPage(1); }}
            />
          ))}
        </Box>

        {/* Favorites filter and view mode toggle */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            icon={favoritesOnly ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            label="Favorites"
            size="small"
            variant={favoritesOnly ? 'filled' : 'outlined'}
            color={favoritesOnly ? 'error' : 'default'}
            onClick={() => { setFavoritesOnly(!favoritesOnly); setPage(1); }}
          />
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, v) => { if (v) setViewMode(v); }}
          >
            <ToggleButton value="grid"><ViewModuleIcon /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Loading skeletons */}
      {isLoading && (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!isLoading && data?.files.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <MenuBookIcon sx={{ fontSize: 80, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6">No files found</Typography>
          <Typography variant="body2">
            {search ? 'Try a different search term' : 'Upload some files to get started!'}
          </Typography>
        </Box>
      )}

      {/* Grid view */}
      {!isLoading && data && data.files.length > 0 && viewMode === 'grid' && (
        <Grid container spacing={2}>
          {data.files.map((file) => (
            <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={file.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* File thumbnail or type icon */}
                {file.file_type === 'image' ? (
                  <CardMedia
                    component="img"
                    height={140}
                    image={apiClient.getPreviewUrl(file.id)}
                    alt={file.original_name}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.50',
                    }}
                  >
                    {fileTypeIcons[file.file_type] || <DescriptionIcon sx={{ fontSize: 48, color: '#9e9e9e' }} />}
                  </Box>
                )}

                <CardContent sx={{ flexGrow: 1, pb: 0.5 }}>
                  <Tooltip title={file.original_name}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.original_name}
                    </Typography>
                  </Tooltip>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)} · {new Date(file.created_at).toLocaleDateString()}
                  </Typography>
                  {file.collection_name && (
                    <Chip
                      label={file.collection_name}
                      size="small"
                      sx={{
                        mt: 0.5,
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: file.collection_color || '#6366f1',
                        color: '#fff',
                      }}
                    />
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 1, pb: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => favoriteMutation.mutate(file.id)}
                    color={file.is_favorite ? 'error' : 'default'}
                  >
                    {file.is_favorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                  </IconButton>
                  <Box>
                    <IconButton size="small" onClick={() => handleDownload(file)}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteDialogFile(file)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* List view */}
      {!isLoading && data && data.files.length > 0 && viewMode === 'list' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {data.files.map((file) => (
            <Card
              key={file.id}
              sx={{
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                gap: 2,
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 4 },
              }}
            >
              {/* File type icon */}
              <Box sx={{ flexShrink: 0, width: 48, display: 'flex', justifyContent: 'center' }}>
                {file.file_type === 'image' ? (
                  <Box
                    component="img"
                    src={apiClient.getPreviewUrl(file.id)}
                    alt={file.original_name}
                    sx={{ width: 48, height: 48, borderRadius: 1, objectFit: 'cover' }}
                  />
                ) : (
                  fileTypeIcons[file.file_type] || <DescriptionIcon sx={{ fontSize: 36 }} />
                )}
              </Box>

              {/* File info */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {file.original_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(file.size)} · {file.file_type} · {new Date(file.created_at).toLocaleDateString()}
                </Typography>
              </Box>

              {/* Collection badge */}
              {file.collection_name && (
                <Chip
                  label={file.collection_name}
                  size="small"
                  sx={{
                    bgcolor: file.collection_color || '#6366f1',
                    color: '#fff',
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                />
              )}

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                <IconButton
                  size="small"
                  onClick={() => favoriteMutation.mutate(file.id)}
                  color={file.is_favorite ? 'error' : 'default'}
                >
                  {file.is_favorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                </IconButton>
                <IconButton size="small" onClick={() => handleDownload(file)}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleteDialogFile(file)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={data.pagination.totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDialogFile} onClose={() => setDeleteDialogFile(null)}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteDialogFile?.original_name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogFile(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteDialogFile && deleteMutation.mutate(deleteDialogFile.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
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

export default LibraryPage;
