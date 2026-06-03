import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Button,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import DescriptionIcon from '@mui/icons-material/Description';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StorageIcon from '@mui/icons-material/Storage';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';

/** Human-readable file size */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Stat card configuration
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactElement;
  color: string;
  bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, bgColor }) => (
  <Card
    className="animate-slide-up"
    sx={{
      borderRadius: 3,
      transition: 'transform 0.2s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
    }}
  >
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 3,
          bgcolor: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

/**
 * Dashboard page showing library statistics at a glance.
 * Displays file counts by type, total storage, and favorites.
 */
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiClient.getStats(),
  });

  return (
    <Box>
      {/* Welcome header with slide-up animation */}
      <Box className="animate-slide-up" sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: '#1a1a2e' }}>
          Welcome{user?.display_name ? `, ${user.display_name}` : ''}!
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Here&apos;s your library overview
        </Typography>
      </Box>

      {/* Stats grid */}
      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StatCard
              label="Total Files"
              value={stats?.total_files ?? 0}
              icon={<StorageIcon />}
              color="#667eea"
              bgColor="#eef2ff"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StatCard
              label="Storage Used"
              value={formatFileSize(stats?.total_size ?? 0)}
              icon={<StorageIcon />}
              color="#8b5cf6"
              bgColor="#f5f3ff"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StatCard
              label="Images"
              value={stats?.image_count ?? 0}
              icon={<ImageIcon />}
              color="#22c55e"
              bgColor="#f0fdf4"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StatCard
              label="PDFs"
              value={stats?.pdf_count ?? 0}
              icon={<PictureAsPdfIcon />}
              color="#ef4444"
              bgColor="#fef2f2"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StatCard
              label="Documents"
              value={stats?.document_count ?? 0}
              icon={<DescriptionIcon />}
              color="#3b82f6"
              bgColor="#eff6ff"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StatCard
              label="eBooks"
              value={stats?.ebook_count ?? 0}
              icon={<MenuBookIcon />}
              color="#8b5cf6"
              bgColor="#f5f3ff"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <StatCard
              label="Favorites"
              value={stats?.favorites_count ?? 0}
              icon={<FavoriteIcon />}
              color="#ec4899"
              bgColor="#fdf2f8"
            />
          </Grid>
        </Grid>
      )}

      {/* Quick action: upload files with animated prompt */}
      {!isLoading && stats?.total_files === 0 && (
        <Box className="animate-slide-up" sx={{ textAlign: 'center', mt: 6 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Your library is empty. Add some files to get started!
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<FileUploadIcon />}
            onClick={() => navigate('/upload')}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)',
              },
            }}
          >
            Upload Files
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default DashboardPage;
