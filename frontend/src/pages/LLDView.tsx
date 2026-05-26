/**
 * LLD viewer and editor page for a specific microservice.
 * Displays detailed Low-Level Design with section-by-section editing.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getProject, getLLD, updateLLD, generateLLD } from '../api/client';
import type { Project, LLD } from '../types';

/* LLD section configuration for tab rendering */
const LLD_SECTIONS = [
  { key: 'component_diagram', label: 'Components' },
  { key: 'class_design', label: 'Class Design' },
  { key: 'database_schema', label: 'Database Schema' },
  { key: 'api_contracts', label: 'API Contracts' },
  { key: 'sequence_flows', label: 'Sequence Flows' },
  { key: 'error_handling', label: 'Error Handling' },
  { key: 'data_validation', label: 'Data Validation' },
  { key: 'caching_strategy', label: 'Caching' },
  { key: 'logging_monitoring', label: 'Logging & Monitoring' },
  { key: 'security_details', label: 'Security' },
  { key: 'raw_content', label: 'Full Document' },
] as const;

type LLDSectionKey = (typeof LLD_SECTIONS)[number]['key'];

export default function LLDView() {
  const { projectId, serviceId } = useParams<{
    projectId: string;
    serviceId: string;
  }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [lld, setLLD] = useState<LLD | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  /* Editing state */
  const [editing, setEditing] = useState(false);
  const [editField, setEditField] = useState<LLDSectionKey>('component_diagram');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  /* Regeneration state */
  const [regenerating, setRegenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId || !serviceId) return;
    try {
      const [proj, lldData] = await Promise.all([
        getProject(projectId),
        getLLD(projectId, serviceId),
      ]);
      setProject(proj);
      setLLD(lldData);
    } catch {
      setError('Failed to load LLD data');
    } finally {
      setLoading(false);
    }
  }, [projectId, serviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function startEdit(field: LLDSectionKey, value: string) {
    setEditField(field);
    setEditValue(value);
    setEditing(true);
  }

  async function saveEdit() {
    if (!projectId || !serviceId) return;
    setSaving(true);
    try {
      const updated = await updateLLD(projectId, serviceId, {
        [editField]: editValue,
      });
      setLLD(updated);
      setEditing(false);
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    if (!projectId || !serviceId) return;
    if (!confirm('Regenerate this LLD? Current content will be replaced.'))
      return;
    setRegenerating(true);
    try {
      const newLLD = await generateLLD(projectId, serviceId, '', true);
      setLLD(newLLD);
    } catch {
      setError('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  }

  /* Find service name from project */
  const serviceName =
    project?.hld?.services.find((s) => s.id === serviceId)?.name ||
    lld?.service_name ||
    'Service';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!lld) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/project/${projectId}/hld`)}
        >
          Back to HLD
        </Button>
        <Alert severity="warning" sx={{ mt: 2 }}>
          No LLD found for this service. Go back and generate one.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/project/${projectId}/hld`)}
          variant="outlined"
          size="small"
        >
          Back to HLD
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">
            LLD: {serviceName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Generated: {new Date(lld.generated_at).toLocaleString()} | Last
            modified: {new Date(lld.last_modified).toLocaleString()}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={
            regenerating ? <CircularProgress size={16} /> : <RefreshIcon />
          }
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          Regenerate
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Section tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {LLD_SECTIONS.map((section) => (
          <Tab key={section.key} label={section.label} />
        ))}
      </Tabs>

      {/* Section content */}
      {LLD_SECTIONS.map((section, idx) => {
        if (tab !== idx) return null;
        const content = lld[section.key] || '';
        return (
          <Card key={section.key}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h5">{section.label}</Typography>
                <Tooltip title="Edit section">
                  <IconButton
                    onClick={() => startEdit(section.key, content)}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  '& p': { mt: 0 },
                  '& h1,& h2,& h3,& h4': { mt: 2 },
                  '& code': {
                    background: 'rgba(108,99,255,0.1)',
                    px: 0.5,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  },
                  '& pre': {
                    background: 'rgba(0,0,0,0.3)',
                    p: 2,
                    borderRadius: 1,
                    overflow: 'auto',
                  },
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    mb: 2,
                  },
                  '& th, & td': {
                    border: '1px solid rgba(255,255,255,0.1)',
                    p: 1,
                    textAlign: 'left',
                  },
                  '& th': {
                    background: 'rgba(108,99,255,0.1)',
                  },
                  '& ul, & ol': { pl: 3 },
                  '& li': { mb: 0.5 },
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || '*No content available for this section*'}
                </ReactMarkdown>
              </Box>
            </CardContent>
          </Card>
        );
      })}

      {/* Edit dialog */}
      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Edit:{' '}
          {LLD_SECTIONS.find((s) => s.key === editField)?.label || editField}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={20}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            sx={{
              mt: 1,
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.85rem',
              },
            }}
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
    </Box>
  );
}
