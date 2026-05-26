/**
 * Project workspace page — upload images, add requirements, and generate HLD/LLD.
 * Provides a tabbed interface for managing all project artifacts.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Stack,
  LinearProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useDropzone } from 'react-dropzone';
import {
  getProject,
  uploadImage,
  deleteImage,
  uploadRequirement,
  deleteRequirement,
  generateHLD,
  generateLLD,
  getImageUrl,
} from '../api/client';
import type { Project, ServiceDefinition } from '../types';
import { SERVICE_TYPE_LABELS } from '../types';

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  /* Image upload state */
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageEndpoint, setImageEndpoint] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  /* Requirements state */
  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqContent, setReqContent] = useState('');
  const [reqTitle, setReqTitle] = useState('');
  const [uploadingReq, setUploadingReq] = useState(false);

  /* HLD generation state */
  const [generatingHLD, setGeneratingHLD] = useState(false);
  const [hldContext, setHldContext] = useState('');
  const [hldDialogOpen, setHldDialogOpen] = useState(false);

  /* LLD generation state */
  const [generatingLLD, setGeneratingLLD] = useState<string | null>(null);

  /* Analysis dialog state */
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  const [analysisContent, setAnalysisContent] = useState('');
  const [analysisTitle, setAnalysisTitle] = useState('');

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getProject(projectId);
      setProject(data);
      setError('');
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  /* Drag-and-drop image handler */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setPendingFile(acceptedFiles[0]);
      setImageDialogOpen(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
    },
    multiple: false,
  });

  async function handleImageUpload() {
    if (!pendingFile || !projectId) return;
    setUploadingImage(true);
    try {
      await uploadImage(projectId, pendingFile, imageEndpoint, imageDescription);
      setImageDialogOpen(false);
      setPendingFile(null);
      setImageEndpoint('');
      setImageDescription('');
      await fetchProject();
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!projectId) return;
    try {
      await deleteImage(projectId, imageId);
      await fetchProject();
    } catch {
      setError('Failed to delete image');
    }
  }

  async function handleAddRequirement() {
    if (!projectId || !reqContent.trim()) return;
    setUploadingReq(true);
    try {
      await uploadRequirement(projectId, undefined, reqContent, reqTitle);
      setReqDialogOpen(false);
      setReqContent('');
      setReqTitle('');
      await fetchProject();
    } catch {
      setError('Failed to add requirement');
    } finally {
      setUploadingReq(false);
    }
  }

  async function handleReqFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setUploadingReq(true);
    try {
      await uploadRequirement(projectId, file);
      await fetchProject();
    } catch {
      setError('Failed to upload requirement');
    } finally {
      setUploadingReq(false);
    }
  }

  async function handleDeleteRequirement(reqId: string) {
    if (!projectId) return;
    try {
      await deleteRequirement(projectId, reqId);
      await fetchProject();
    } catch {
      setError('Failed to delete requirement');
    }
  }

  async function handleGenerateHLD() {
    if (!projectId) return;
    setGeneratingHLD(true);
    setHldDialogOpen(false);
    try {
      await generateHLD(projectId, hldContext, !!project?.hld);
      setHldContext('');
      await fetchProject();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'HLD generation failed';
      setError(message);
    } finally {
      setGeneratingHLD(false);
    }
  }

  async function handleGenerateLLD(service: ServiceDefinition) {
    if (!projectId) return;
    setGeneratingLLD(service.id);
    try {
      await generateLLD(projectId, service.id, '', !service.lld_generated);
      await fetchProject();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'LLD generation failed';
      setError(message);
    } finally {
      setGeneratingLLD(null);
    }
  }

  function showAnalysis(title: string, content: string) {
    setAnalysisTitle(title);
    setAnalysisContent(content);
    setAnalysisDialogOpen(true);
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!project) {
    return (
      <Alert severity="error">Project not found</Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Project header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {project.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip label={project.target_scale} size="small" color="primary" variant="outlined" />
          <Chip label={project.primary_language} size="small" color="secondary" variant="outlined" />
          <Chip label={project.cloud_provider} size="small" variant="outlined" />
        </Stack>
        {project.description && (
          <Typography variant="body1" color="text.secondary">
            {project.description}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Loading indicator for HLD generation */}
      {generatingHLD && (
        <Alert severity="info" icon={<SmartToyIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            AI is generating your High-Level Design... This may take 30-60 seconds.
          </Typography>
          <LinearProgress />
        </Alert>
      )}

      {/* Tab navigation */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`UI Designs (${project.images.length})`} />
        <Tab label={`Requirements (${project.requirements.length})`} />
        <Tab label="Architecture" disabled={!project.hld} />
      </Tabs>

      {/* Tab 0: UI Design Images */}
      {tab === 0 && (
        <Box>
          {/* Dropzone for image upload */}
          <Card
            {...getRootProps()}
            sx={{
              p: 4,
              mb: 3,
              textAlign: 'center',
              cursor: 'pointer',
              border: isDragActive
                ? '2px dashed #6C63FF'
                : '2px dashed rgba(255,255,255,0.1)',
              background: isDragActive
                ? 'rgba(108,99,255,0.05)'
                : 'transparent',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                background: 'rgba(108,99,255,0.03)',
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon
              sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
            />
            <Typography variant="h6" color="text.secondary">
              {isDragActive
                ? 'Drop your UI design here'
                : 'Drag & drop UI design images here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse — PNG, JPG, GIF, WebP supported
            </Typography>
          </Card>

          {/* Uploaded images grid */}
          <Grid container spacing={2}>
            {project.images.map((img) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={img.id}>
                <Card sx={{ height: '100%' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={getImageUrl(img.filename)}
                    alt={img.original_name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                        {img.original_name}
                      </Typography>
                      <Box>
                        {img.ai_analysis && (
                          <Tooltip title="View AI Analysis">
                            <IconButton
                              size="small"
                              onClick={() =>
                                showAnalysis(
                                  `AI Analysis: ${img.original_name}`,
                                  img.ai_analysis
                                )
                              }
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteImage(img.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    {img.endpoint && (
                      <Chip
                        label={img.endpoint}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                    {img.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {img.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Generate HLD button */}
          {(project.images.length > 0 || project.requirements.length > 0) && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => setHldDialogOpen(true)}
                disabled={generatingHLD}
                sx={{
                  background: 'linear-gradient(135deg, #6C63FF, #00BFA6)',
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                }}
              >
                {project.hld ? 'Regenerate HLD' : 'Generate HLD'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Tab 1: Requirements */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<NoteAddIcon />}
              onClick={() => setReqDialogOpen(true)}
            >
              Add Requirement
            </Button>
            <Button variant="outlined" component="label">
              Upload Document
              <input
                type="file"
                hidden
                accept=".txt,.md,.pdf,.docx,.doc"
                onChange={handleReqFileUpload}
              />
            </Button>
            {uploadingReq && <CircularProgress size={24} />}
          </Stack>

          {project.requirements.length === 0 ? (
            <Card
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed rgba(255,255,255,0.1)',
                background: 'transparent',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                No requirements added yet. Add requirements to help generate more
                accurate designs.
              </Typography>
            </Card>
          ) : (
            <Stack spacing={2}>
              {project.requirements.map((req) => (
                <Card key={req.id}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {req.original_name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteRequirement(req.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                        whiteSpace: 'pre-wrap',
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      {req.content.substring(0, 1000)}
                      {req.content.length > 1000 && '...'}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {/* Generate HLD button */}
          {(project.images.length > 0 || project.requirements.length > 0) && (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => setHldDialogOpen(true)}
                disabled={generatingHLD}
                sx={{
                  background: 'linear-gradient(135deg, #6C63FF, #00BFA6)',
                  px: 4,
                  py: 1.5,
                }}
              >
                {project.hld ? 'Regenerate HLD' : 'Generate HLD'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Tab 2: Architecture (Services from HLD) */}
      {tab === 2 && project.hld && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">{project.hld.title}</Typography>
            <Button
              variant="outlined"
              onClick={() => navigate(`/project/${projectId}/hld`)}
              endIcon={<ArrowForwardIcon />}
            >
              View Full HLD
            </Button>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {project.hld.overview.substring(0, 300)}
            {project.hld.overview.length > 300 && '...'}
          </Typography>

          {/* Services grid — each card links to its LLD */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Microservices ({project.hld.services.length})
          </Typography>
          <Grid container spacing={2}>
            {project.hld.services.map((svc) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={svc.id}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'all 0.2s',
                    cursor: svc.lld_generated ? 'pointer' : 'default',
                    '&:hover': svc.lld_generated
                      ? {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 20px rgba(0,191,166,0.15)',
                          borderColor: 'secondary.main',
                        }
                      : {},
                  }}
                  onClick={() =>
                    svc.lld_generated &&
                    navigate(`/project/${projectId}/lld/${svc.id}`)
                  }
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
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {svc.name}
                      </Typography>
                      <Chip
                        label={
                          SERVICE_TYPE_LABELS[svc.service_type] ||
                          svc.service_type
                        }
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1.5, minHeight: 40 }}
                    >
                      {svc.description.substring(0, 120)}
                      {svc.description.length > 120 && '...'}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      useFlexGap
                      sx={{ mb: 1.5, flexWrap: 'wrap' }}
                    >
                      {svc.technology_stack.slice(0, 4).map((tech) => (
                        <Chip
                          key={tech}
                          label={tech}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {svc.technology_stack.length > 4 && (
                        <Chip
                          label={`+${svc.technology_stack.length - 4}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Stack>

                    {/* Generate or view LLD button */}
                    {svc.lld_generated ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        fullWidth
                        endIcon={<ArrowForwardIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project/${projectId}/lld/${svc.id}`);
                        }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateLLD(svc);
                        }}
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

      {/* Image upload dialog with endpoint metadata */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload UI Design</DialogTitle>
        <DialogContent>
          {pendingFile && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              File: {pendingFile.name}
            </Typography>
          )}
          <TextField
            label="Endpoint / Screen Name"
            fullWidth
            value={imageEndpoint}
            onChange={(e) => setImageEndpoint(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="e.g., /api/users/login, Dashboard Screen"
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={imageDescription}
            onChange={(e) => setImageDescription(e.target.value)}
            placeholder="Brief description of this UI screen..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleImageUpload}
            disabled={uploadingImage}
          >
            {uploadingImage ? <CircularProgress size={20} /> : 'Upload & Analyze'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Requirements text input dialog */}
      <Dialog
        open={reqDialogOpen}
        onClose={() => setReqDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Requirement</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            fullWidth
            value={reqTitle}
            onChange={(e) => setReqTitle(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            placeholder="e.g., User Authentication Requirements"
          />
          <TextField
            label="Requirement Details"
            fullWidth
            multiline
            rows={10}
            value={reqContent}
            onChange={(e) => setReqContent(e.target.value)}
            placeholder="Describe your system requirements in detail..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddRequirement}
            disabled={!reqContent.trim() || uploadingReq}
          >
            {uploadingReq ? <CircularProgress size={20} /> : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* HLD generation dialog with additional context */}
      <Dialog
        open={hldDialogOpen}
        onClose={() => setHldDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {project.hld ? 'Regenerate HLD' : 'Generate HLD'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The AI will analyze your uploaded UI designs and requirements to
            generate a comprehensive High-Level Design document following
            microservices best practices.
          </Typography>
          <TextField
            label="Additional Context (optional)"
            fullWidth
            multiline
            rows={4}
            value={hldContext}
            onChange={(e) => setHldContext(e.target.value)}
            placeholder="Any extra instructions or constraints for the AI..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHldDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleGenerateHLD}
            startIcon={<AutoAwesomeIcon />}
            sx={{
              background: 'linear-gradient(135deg, #6C63FF, #00BFA6)',
            }}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Analysis viewer dialog */}
      <Dialog
        open={analysisDialogOpen}
        onClose={() => setAnalysisDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{analysisTitle}</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
          >
            {analysisContent}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalysisDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
