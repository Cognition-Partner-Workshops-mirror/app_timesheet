/**
 * Dashboard page — lists all projects and allows creating new ones.
 * Displays project cards with summary statistics.
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useNavigate } from 'react-router-dom';
import { listProjects, createProject, deleteProject } from '../api/client';
import type { ProjectSummary } from '../types';

/* Scale options for the project configuration */
const SCALE_OPTIONS = ['small', 'medium', 'large', 'enterprise'];
const LANGUAGE_OPTIONS = [
  'Java/Spring Boot',
  'Python/FastAPI',
  'Node.js/Express',
  'Go',
  '.NET/C#',
  'Rust',
  'Mixed',
];
const CLOUD_OPTIONS = [
  'Cloud Agnostic',
  'AWS',
  'Azure',
  'GCP',
  'On-Premise',
  'Hybrid',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  /* New project form state */
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newScale, setNewScale] = useState('medium');
  const [newLang, setNewLang] = useState('Java/Spring Boot');
  const [newCloud, setNewCloud] = useState('Cloud Agnostic');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    try {
      const data = await listProjects();
      setProjects(data);
      setError('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const project = await createProject({
        name: newName,
        description: newDesc,
        target_scale: newScale,
        primary_language: newLang,
        cloud_provider: newCloud,
      });
      setDialogOpen(false);
      setNewName('');
      setNewDesc('');
      navigate(`/project/${project.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this project and all its data?')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Failed to delete project');
    }
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Architecture Design Studio
          </Typography>
          <Typography variant="body1" color="text.secondary">
            AI-powered HLD & LLD generation for microservices architectures
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          size="large"
          sx={{
            background: 'linear-gradient(135deg, #6C63FF, #5048CC)',
            px: 3,
            py: 1.5,
          }}
        >
          New Project
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Project cards grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : projects.length === 0 ? (
        <Card
          sx={{
            p: 6,
            textAlign: 'center',
            border: '2px dashed rgba(108,99,255,0.3)',
            background: 'transparent',
          }}
        >
          <AccountTreeIcon
            sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary">
            No projects yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first project to start generating architecture designs
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Create Project
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {projects.map((p) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(108,99,255,0.15)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(`/project/${p.id}`)}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                        {p.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleDelete(e, p.id)}
                        sx={{ ml: 1, color: 'text.secondary' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {p.description || 'No description'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                      <Chip
                        icon={<ImageIcon />}
                        label={`${p.image_count} images`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<DescriptionIcon />}
                        label={`${p.requirement_count} docs`}
                        size="small"
                        variant="outlined"
                      />
                      {p.has_hld && (
                        <Chip
                          label={`${p.service_count} services`}
                          size="small"
                          color="primary"
                        />
                      )}
                      {p.lld_count > 0 && (
                        <Chip
                          label={`${p.lld_count} LLDs`}
                          size="small"
                          color="secondary"
                        />
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create project dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Project Name"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            placeholder="e.g., E-Commerce Platform"
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Brief description of the system you want to design..."
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Target Scale"
                fullWidth
                value={newScale}
                onChange={(e) => setNewScale(e.target.value)}
              >
                {SCALE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Primary Language"
                fullWidth
                value={newLang}
                onChange={(e) => setNewLang(e.target.value)}
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Cloud Provider"
                fullWidth
                value={newCloud}
                onChange={(e) => setNewCloud(e.target.value)}
              >
                {CLOUD_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
          >
            {creating ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
