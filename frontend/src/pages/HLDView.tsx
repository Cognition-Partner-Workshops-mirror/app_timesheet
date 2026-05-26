/**
 * HLD viewer and editor page.
 * Displays the full High-Level Design with interactive editing capabilities.
 * Each service card navigates to its respective LLD.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getProject,
  updateHLD,
  addService,
  deleteService,
  generateLLD,
} from '../api/client';
import type { Project, ServiceDefinition } from '../types';
import {
  SERVICE_TYPE_LABELS,
  PATTERN_CATEGORY_LABELS,
} from '../types';

export default function HLDView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  /* Editing state */
  const [editing, setEditing] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  /* Add service dialog */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcDesc, setNewSvcDesc] = useState('');
  const [newSvcType, setNewSvcType] = useState('backend_service');

  /* LLD generation */
  const [generatingLLD, setGeneratingLLD] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getProject(projectId);
      setProject(data);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  function startEdit(field: string, value: string) {
    setEditField(field);
    setEditValue(value);
    setEditing(true);
  }

  async function saveEdit() {
    if (!projectId || !project?.hld) return;
    setSaving(true);
    try {
      await updateHLD(projectId, { [editField]: editValue });
      setEditing(false);
      await fetchProject();
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddService() {
    if (!projectId || !newSvcName.trim()) return;
    try {
      await addService(projectId, {
        name: newSvcName,
        service_type: newSvcType,
        description: newSvcDesc,
      });
      setAddDialogOpen(false);
      setNewSvcName('');
      setNewSvcDesc('');
      await fetchProject();
    } catch {
      setError('Failed to add service');
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!projectId || !confirm('Delete this service?')) return;
    try {
      await deleteService(projectId, serviceId);
      await fetchProject();
    } catch {
      setError('Failed to delete service');
    }
  }

  async function handleGenerateLLD(svc: ServiceDefinition) {
    if (!projectId) return;
    setGeneratingLLD(svc.id);
    try {
      await generateLLD(projectId, svc.id);
      await fetchProject();
    } catch {
      setError('LLD generation failed');
    } finally {
      setGeneratingLLD(null);
    }
  }

  /* Editable section component with inline edit toggle */
  function EditableSection({
    title,
    field,
    content,
  }: {
    title: string;
    field: string;
    content: string;
  }) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant="h6">{title}</Typography>
            <Tooltip title="Edit section">
              <IconButton
                size="small"
                onClick={() => startEdit(field, content)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ '& p': { mt: 0 }, '& h1,& h2,& h3': { mt: 1 } }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || '*No content yet*'}
            </ReactMarkdown>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!project?.hld) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/project/${projectId}`)}
        >
          Back to Project
        </Button>
        <Alert severity="warning" sx={{ mt: 2 }}>
          No HLD generated yet. Go back and generate one first.
        </Alert>
      </Box>
    );
  }

  const hld = project.hld;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/project/${projectId}`)}
          variant="outlined"
          size="small"
        >
          Back
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">{hld.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(hld.generated_at).toLocaleString()} | Last
            modified: {new Date(hld.last_modified).toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Tab navigation */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Overview" />
        <Tab label={`Services (${hld.services.length})`} />
        <Tab label={`Design Patterns (${hld.design_patterns.length})`} />
        <Tab label="Strategies" />
        <Tab label="Full Document" />
      </Tabs>

      {/* Tab 0: Overview */}
      {tab === 0 && (
        <Box>
          <EditableSection
            title="System Overview"
            field="overview"
            content={hld.overview}
          />
          <EditableSection
            title="Architecture Overview"
            field="architecture_overview"
            content={hld.architecture_overview}
          />
        </Box>
      )}

      {/* Tab 1: Services — each links to its LLD */}
      {tab === 1 && (
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h5">Microservices</Typography>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setAddDialogOpen(true)}
            >
              Add Service
            </Button>
          </Box>
          <Grid container spacing={2}>
            {hld.services.map((svc) => (
              <Grid size={{ xs: 12, md: 6 }} key={svc.id}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: svc.lld_generated
                        ? 'secondary.main'
                        : 'primary.main',
                      boxShadow: '0 4px 20px rgba(108,99,255,0.1)',
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6">{svc.name}</Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip
                          label={
                            SERVICE_TYPE_LABELS[svc.service_type] ||
                            svc.service_type
                          }
                          size="small"
                          color="primary"
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteService(svc.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1.5 }}
                    >
                      {svc.description}
                    </Typography>

                    {/* Responsibilities */}
                    {svc.responsibilities.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Responsibilities:
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          useFlexGap
                          sx={{ mt: 0.5, flexWrap: 'wrap' }}
                        >
                          {svc.responsibilities.map((r, i) => (
                            <Chip
                              key={i}
                              label={r}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Tech stack */}
                    {svc.technology_stack.length > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Tech Stack:
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          useFlexGap
                          sx={{ mt: 0.5, flexWrap: 'wrap' }}
                        >
                          {svc.technology_stack.map((t) => (
                            <Chip
                              key={t}
                              label={t}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}

                    {/* Endpoints summary */}
                    {svc.endpoints.length > 0 && (
                      <Accordion
                        disableGutters
                        sx={{
                          background: 'transparent',
                          boxShadow: 'none',
                          mt: 1,
                          '&:before': { display: 'none' },
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="caption">
                            {svc.endpoints.length} Endpoints
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          {svc.endpoints.map((ep, i) => (
                            <Box
                              key={i}
                              sx={{
                                display: 'flex',
                                gap: 1,
                                alignItems: 'center',
                                py: 0.5,
                              }}
                            >
                              <Chip
                                label={ep.method}
                                size="small"
                                color={
                                  ep.method === 'GET'
                                    ? 'success'
                                    : ep.method === 'POST'
                                      ? 'primary'
                                      : ep.method === 'DELETE'
                                        ? 'error'
                                        : 'warning'
                                }
                                sx={{
                                  fontSize: '0.65rem',
                                  minWidth: 50,
                                  fontFamily: 'monospace',
                                }}
                              />
                              <Typography
                                variant="caption"
                                sx={{ fontFamily: 'monospace' }}
                              >
                                {ep.path}
                              </Typography>
                            </Box>
                          ))}
                        </AccordionDetails>
                      </Accordion>
                    )}

                    <Divider sx={{ my: 1.5 }} />

                    {/* Navigate to LLD */}
                    {svc.lld_generated ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        fullWidth
                        endIcon={<ArrowForwardIcon />}
                        onClick={() =>
                          navigate(`/project/${projectId}/lld/${svc.id}`)
                        }
                      >
                        View LLD
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        startIcon={
                          generatingLLD === svc.id ? (
                            <CircularProgress size={16} />
                          ) : (
                            <AutoAwesomeIcon />
                          )
                        }
                        onClick={() => handleGenerateLLD(svc)}
                        disabled={generatingLLD !== null}
                        sx={{
                          background:
                            'linear-gradient(135deg, #00BFA6, #00897B)',
                        }}
                      >
                        Generate LLD
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Tab 2: Design Patterns */}
      {tab === 2 && (
        <Box>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Applied Design Patterns
          </Typography>
          <Grid container spacing={2}>
            {hld.design_patterns.map((pattern, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {pattern.name}
                      </Typography>
                      <Chip
                        label={
                          PATTERN_CATEGORY_LABELS[pattern.category] ||
                          pattern.category
                        }
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {pattern.description}
                    </Typography>
                    <Typography variant="caption" color="secondary.main">
                      Rationale: {pattern.rationale}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Tab 3: Strategies */}
      {tab === 3 && (
        <Box>
          <EditableSection
            title="Scalability Strategy"
            field="scalability_strategy"
            content={hld.scalability_strategy}
          />
          <EditableSection
            title="Security Strategy"
            field="security_strategy"
            content={hld.security_strategy}
          />
          <EditableSection
            title="Reliability Strategy"
            field="reliability_strategy"
            content={hld.reliability_strategy}
          />
          <EditableSection
            title="Communication Patterns"
            field="communication_patterns"
            content={hld.communication_patterns}
          />
          <EditableSection
            title="Deployment Strategy"
            field="deployment_strategy"
            content={hld.deployment_strategy}
          />
        </Box>
      )}

      {/* Tab 4: Full Document (raw markdown) */}
      {tab === 4 && (
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h5">Full HLD Document</Typography>
              <Tooltip title="Edit document">
                <IconButton
                  onClick={() => startEdit('raw_content', hld.raw_content)}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                '& p': { mt: 0 },
                '& h1,& h2,& h3': { mt: 2 },
                '& code': {
                  background: 'rgba(108,99,255,0.1)',
                  px: 0.5,
                  borderRadius: 1,
                },
                '& pre': {
                  background: 'rgba(0,0,0,0.3)',
                  p: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                },
                '& table': { width: '100%', borderCollapse: 'collapse' },
                '& th, & td': {
                  border: '1px solid rgba(255,255,255,0.1)',
                  p: 1,
                },
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {hld.raw_content || '*No full document content generated*'}
              </ReactMarkdown>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Inline edit dialog */}
      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit: {editField.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={15}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            sx={{ mt: 1, fontFamily: 'monospace' }}
            placeholder="Enter markdown content..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={saveEdit}
            disabled={saving}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add service dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Service</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Service Name"
            fullWidth
            value={newSvcName}
            onChange={(e) => setNewSvcName(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newSvcDesc}
            onChange={(e) => setNewSvcDesc(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            label="Service Type"
            fullWidth
            value={newSvcType}
            onChange={(e) => setNewSvcType(e.target.value)}
            slotProps={{ select: { native: true } }}
          >
            {Object.entries(SERVICE_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddService}
            disabled={!newSvcName.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
