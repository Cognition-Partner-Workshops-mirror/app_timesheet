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
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import apiClient from '../api/client';
import type { FileQueryParams, LibraryFile, FileType } from '../types/api';

/* Large book-cover icons per file type */
const fileTypeIcons: Record<string, React.ReactElement> = {
  pdf: <PictureAsPdfIcon sx={{ fontSize: 56, color: '#fff', opacity: 0.9 }} />,
  image: <ImageIcon sx={{ fontSize: 56, color: '#fff', opacity: 0.9 }} />,
  document: <DescriptionIcon sx={{ fontSize: 56, color: '#fff', opacity: 0.9 }} />,
  ebook: <MenuBookIcon sx={{ fontSize: 56, color: '#fff', opacity: 0.9 }} />,
};

/* Gradient covers per file type — gives each book a unique color */
const bookCoverGradients: Record<string, string> = {
  pdf: 'linear-gradient(145deg, #e53935 0%, #b71c1c 100%)',
  image: 'linear-gradient(145deg, #43a047 0%, #1b5e20 100%)',
  document: 'linear-gradient(145deg, #1e88e5 0%, #0d47a1 100%)',
  ebook: 'linear-gradient(145deg, #8e24aa 0%, #4a148c 100%)',
};

/* Spine colors per type for the left-side accent */
const spineColors: Record<string, string> = {
  pdf: '#c62828',
  image: '#2e7d32',
  document: '#1565c0',
  ebook: '#6a1b9a',
};

/**
 * Strips the file extension from a file name for a cleaner display.
 */
function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.substring(0, dot) : name;
}

/**
 * Main library page — clean bookshelf view with book-cover cards.
 * Shows only the file name (no metadata). All files stored locally on device.
 */
const LibraryPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

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

  const queryParams: FileQueryParams = {
    sort_by: sortBy,
    sort_order: sortOrder,
    file_type: fileTypeFilter,
    favorites_only: favoritesOnly,
    search: search || undefined,
    page,
    limit: 20,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['files', queryParams],
    queryFn: () => apiClient.getFiles(queryParams),
  });

  const favoriteMutation = useMutation({
    mutationFn: (id: number) => apiClient.toggleFavorite(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['files'] }); },
  });

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

  /* Split files into shelf rows (4 per row desktop, 2 mobile) */
  const booksPerShelf = isMobile ? 2 : 4;
  const shelves: LibraryFile[][] = [];
  if (data?.files) {
    for (let i = 0; i < data.files.length; i += booksPerShelf) {
      shelves.push(data.files.slice(i, i + booksPerShelf));
    }
  }

  return (
    <Box>
      {/* ── Compact toolbar ── */}
      <Box
        className="animate-slide-up"
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 1.5,
          mb: 3,
          alignItems: isMobile ? 'stretch' : 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <TextField
          placeholder="Search your library…"
          value={search}
          onChange={handleSearchChange}
          size="small"
          sx={{
            flex: 1,
            minWidth: 180,
            '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#fff' },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start"><SearchIcon /></InputAdornment>
              ),
            },
          }}
        />

        {/* Sort */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <SortIcon fontSize="small" color="action" />
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel>Sort</InputLabel>
            <Select
              value={sortBy}
              label="Sort"
              onChange={(e) => { setSortBy(e.target.value as FileQueryParams['sort_by']); setPage(1); }}
            >
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="size">Size</MenuItem>
              <MenuItem value="type">Type</MenuItem>
            </Select>
          </FormControl>
          <ToggleButtonGroup size="small" value={sortOrder} exclusive onChange={(_, v) => { if (v) { setSortOrder(v); setPage(1); } }}>
            <ToggleButton value="desc">↓</ToggleButton>
            <ToggleButton value="asc">↑</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Type filter */}
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

        {/* Favorites + view toggle */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Chip
            icon={favoritesOnly ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            label="Favorites"
            size="small"
            variant={favoritesOnly ? 'filled' : 'outlined'}
            color={favoritesOnly ? 'error' : 'default'}
            onClick={() => { setFavoritesOnly(!favoritesOnly); setPage(1); }}
          />
          <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_, v) => { if (v) setViewMode(v); }}>
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
              <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!isLoading && data?.files.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10, color: 'text.secondary' }}>
          <Box className="animate-pulse-glow" sx={{ display: 'inline-block' }}>
            <AutoStoriesIcon sx={{ fontSize: 100, opacity: 0.35, mb: 2, color: '#667eea' }} />
          </Box>
          <Typography variant="h6">No files found</Typography>
          <Typography variant="body2">
            {search ? 'Try a different search term' : 'Add some files to your local library!'}
          </Typography>
        </Box>
      )}

      {/* ── GRID VIEW: book-cover cards on wooden shelves ── */}
      {!isLoading && data && data.files.length > 0 && viewMode === 'grid' && (
        <Box>
          {shelves.map((shelf, shelfIdx) => (
            <Box key={shelfIdx} className="bookshelf-rack" sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                {shelf.map((file) => (
                  <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2.4 }} key={file.id} className="animate-page-flip">
                    <Box
                      className="book-card"
                      sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: 'default',
                        /* Book-spine accent on the left edge */
                        borderLeft: `6px solid ${spineColors[file.file_type] || '#757575'}`,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.10), -3px 4px 8px rgba(0,0,0,0.07)',
                        bgcolor: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      }}
                    >
                      {/* Book cover area — gradient or image thumbnail */}
                      {file.file_type === 'image' ? (
                        <Box
                          component="img"
                          src={apiClient.getPreviewUrl(file.id)}
                          alt={file.original_name}
                          sx={{ width: '100%', height: 160, objectFit: 'cover' }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 160,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: bookCoverGradients[file.file_type] || 'linear-gradient(145deg, #757575, #424242)',
                            /* Subtle page texture overlay */
                            backgroundImage: `
                              ${bookCoverGradients[file.file_type] || 'linear-gradient(145deg, #757575, #424242)'},
                              repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.04) 23px, rgba(255,255,255,0.04) 24px)
                            `,
                          }}
                        >
                          {fileTypeIcons[file.file_type] || <DescriptionIcon sx={{ fontSize: 56, color: '#fff', opacity: 0.9 }} />}
                        </Box>
                      )}

                      {/* Book title — just the name, no metadata */}
                      <Box sx={{ px: 1.5, py: 1.5, flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        <Tooltip title={file.original_name}>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.35,
                              fontSize: '0.82rem',
                              color: '#1a1a2e',
                            }}
                          >
                            {stripExtension(file.original_name)}
                          </Typography>
                        </Tooltip>
                      </Box>

                      {/* Minimal action row — favorite heart only (download/delete on hover) */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          px: 0.5,
                          pb: 0.5,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => favoriteMutation.mutate(file.id)}
                          color={file.is_favorite ? 'error' : 'default'}
                        >
                          {file.is_favorite ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                        <Box sx={{ opacity: 0.5, '&:hover': { opacity: 1 }, transition: 'opacity 0.2s' }}>
                          <IconButton size="small" onClick={() => handleDownload(file)}>
                            <DownloadIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => setDeleteDialogFile(file)} color="error">
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
      )}

      {/* ── LIST VIEW: simple rows with book name only ── */}
      {!isLoading && data && data.files.length > 0 && viewMode === 'list' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {data.files.map((file, idx) => (
            <Box
              key={file.id}
              className="animate-slide-up"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
                px: 2,
                bgcolor: '#fff',
                borderRadius: 2.5,
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                borderLeft: `5px solid ${spineColors[file.file_type] || '#757575'}`,
                transition: 'box-shadow 0.2s, transform 0.15s',
                '&:hover': { boxShadow: '0 3px 10px rgba(0,0,0,0.1)', transform: 'translateX(2px)' },
                animationDelay: `${idx * 0.03}s`,
              }}
            >
              {/* Type icon */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  background: bookCoverGradients[file.file_type] || 'linear-gradient(145deg, #757575, #424242)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {file.file_type === 'pdf' && <PictureAsPdfIcon sx={{ fontSize: 20, color: '#fff' }} />}
                {file.file_type === 'image' && <ImageIcon sx={{ fontSize: 20, color: '#fff' }} />}
                {file.file_type === 'document' && <DescriptionIcon sx={{ fontSize: 20, color: '#fff' }} />}
                {file.file_type === 'ebook' && <MenuBookIcon sx={{ fontSize: 20, color: '#fff' }} />}
              </Box>

              {/* Just the name */}
              <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0, color: '#1a1a2e' }}>
                {stripExtension(file.original_name)}
              </Typography>

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                <IconButton size="small" onClick={() => favoriteMutation.mutate(file.id)} color={file.is_favorite ? 'error' : 'default'}>
                  {file.is_favorite ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
                </IconButton>
                <IconButton size="small" onClick={() => handleDownload(file)}>
                  <DownloadIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleteDialogFile(file)} color="error">
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination count={data.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" shape="rounded" />
        </Box>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteDialogFile} onClose={() => setDeleteDialogFile(null)}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{deleteDialogFile?.original_name}</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogFile(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteDialogFile && deleteMutation.mutate(deleteDialogFile.id)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LibraryPage;
