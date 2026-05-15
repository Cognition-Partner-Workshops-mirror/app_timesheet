/**
 * ReportBuilderPage - Main page component for the Report Builder feature.
 * Orchestrates the field selection, filtering, grouping, sorting,
 * and preview components into a unified report building experience.
 * Uses the existing API client to fetch work entries and clients data.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  CircularProgress,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import type {
  SelectedField,
  ReportFilter,
  ReportGrouping,
  ReportSort,
  ReportRow,
  ReportField,
} from '../types/reportBuilder';
import type { WorkEntryWithClient, Client } from '../types/api';

import {
  FieldSelector,
  FilterPanel,
  GroupingPanel,
  SortPanel,
  ReportPreview,
  AVAILABLE_FIELDS,
  buildReportRows,
  generateReport,
} from '../components/ReportBuilder';

/* Steps displayed in the report builder stepper */
const BUILDER_STEPS = [
  'Name Your Report',
  'Select Fields',
  'Configure Filters',
  'Set Grouping & Sorting',
  'Preview & Export',
];

const ReportBuilderPage: React.FC = () => {
  /* Report configuration state */
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [grouping, setGrouping] = useState<ReportGrouping | null>(null);
  const [sort, setSort] = useState<ReportSort | null>(null);

  /* UI state for stepper navigation and section collapsing */
  const [activeStep, setActiveStep] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fields: true,
    filters: true,
    grouping: true,
    sorting: true,
  });

  /* Generated report rows for the preview table */
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);

  /* Fetch work entries from the API for report data */
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ['workEntries'],
    queryFn: () => apiClient.getWorkEntries(),
  });

  /* Fetch clients from the API for joining with work entries */
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.getClients(),
  });

  const isLoading = entriesLoading || clientsLoading;

  /* Extract arrays from API responses */
  const entries: WorkEntryWithClient[] = useMemo(
    () => (entriesData?.workEntries || []) as WorkEntryWithClient[],
    [entriesData]
  );
  const clients: Client[] = useMemo(
    () => (clientsData?.clients || []) as Client[],
    [clientsData]
  );

  /**
   * Toggle a field's selection status.
   * Adds or removes the field from selectedFields array.
   */
  const handleFieldToggle = useCallback((field: ReportField) => {
    setSelectedFields((prev) => {
      const existing = prev.find((f) => f.id === field.id);
      if (existing) {
        /* Remove field if already selected */
        return prev.filter((f) => f.id !== field.id);
      }
      /* Add field with default visible=true */
      return [...prev, { ...field, visible: true }];
    });
  }, []);

  /**
   * Add a new empty filter condition.
   * Defaults to the first selected field with 'equals' operator.
   */
  const handleAddFilter = useCallback(() => {
    if (selectedFields.length === 0) return;
    const newFilter: ReportFilter = {
      id: `filter-${Date.now()}`,
      fieldId: selectedFields[0].id,
      operator: 'equals',
      value: '',
    };
    setFilters((prev) => [...prev, newFilter]);
  }, [selectedFields]);

  /**
   * Update an existing filter's properties.
   */
  const handleUpdateFilter = useCallback(
    (id: string, updates: Partial<ReportFilter>) => {
      setFilters((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  /**
   * Remove a filter by its ID.
   */
  const handleRemoveFilter = useCallback((id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /**
   * Generate the report by processing raw data through
   * filters, grouping, and sorting pipeline.
   */
  const handleGenerateReport = useCallback(() => {
    const rawRows = buildReportRows(entries, clients);
    const result = generateReport(rawRows, selectedFields, filters, grouping, sort);
    setReportRows(result);
  }, [entries, clients, selectedFields, filters, grouping, sort]);

  /**
   * Toggle a section's expanded/collapsed state.
   */
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  /* Navigate to the next step in the stepper */
  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, BUILDER_STEPS.length - 1));
    /* Auto-generate report when reaching the preview step */
    if (activeStep === BUILDER_STEPS.length - 2) {
      handleGenerateReport();
    }
  };

  /* Navigate to the previous step */
  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Report Builder
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Build custom reports by selecting fields, applying filters, and configuring
        grouping. Preview and export your results as CSV.
      </Typography>

      {entries.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No work entries found. Create some work entries first to build reports.
        </Alert>
      )}

      {/* Stepper view for guided report building */}
      <Grid container spacing={3}>
        {/* Left panel: Stepper navigation */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {BUILDER_STEPS.map((label, index) => (
                <Step key={label}>
                  <StepLabel
                    onClick={() => setActiveStep(index)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {label}
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="text.secondary">
                      {index === 0 && 'Give your report a name and description.'}
                      {index === 1 && 'Choose which data columns to include.'}
                      {index === 2 && 'Add conditions to filter your data.'}
                      {index === 3 && 'Group rows and configure sort order.'}
                      {index === 4 && 'Review your report and export as CSV.'}
                    </Typography>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grid>

        {/* Right panel: Active step content */}
        <Grid size={{ xs: 12, md: 9 }}>
          {/* Step 0: Report Name and Description */}
          {activeStep === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Name Your Report
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Report Name"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  fullWidth
                  placeholder="e.g., Monthly Hours by Client"
                  helperText="Give your report a descriptive name."
                />
                <TextField
                  label="Description (optional)"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Describe the purpose of this report..."
                />
              </Box>
            </Paper>
          )}

          {/* Step 1: Field Selection */}
          {activeStep === 1 && (
            <FieldSelector
              availableFields={AVAILABLE_FIELDS}
              selectedFields={selectedFields}
              onFieldToggle={handleFieldToggle}
            />
          )}

          {/* Step 2: Filter Configuration */}
          {activeStep === 2 && (
            <FilterPanel
              filters={filters}
              selectedFields={selectedFields}
              onAddFilter={handleAddFilter}
              onUpdateFilter={handleUpdateFilter}
              onRemoveFilter={handleRemoveFilter}
            />
          )}

          {/* Step 3: Grouping and Sorting */}
          {activeStep === 3 && (
            <Box display="flex" flexDirection="column" gap={2}>
              {/* Collapsible Grouping section */}
              <Box>
                <Box
                  display="flex"
                  alignItems="center"
                  onClick={() => toggleSection('grouping')}
                  sx={{ cursor: 'pointer' }}
                >
                  <IconButton size="small">
                    {expandedSections.grouping ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                  <Typography variant="subtitle1">Grouping</Typography>
                </Box>
                <Collapse in={expandedSections.grouping}>
                  <GroupingPanel
                    grouping={grouping}
                    selectedFields={selectedFields}
                    onGroupingChange={setGrouping}
                  />
                </Collapse>
              </Box>

              {/* Collapsible Sorting section */}
              <Box>
                <Box
                  display="flex"
                  alignItems="center"
                  onClick={() => toggleSection('sorting')}
                  sx={{ cursor: 'pointer' }}
                >
                  <IconButton size="small">
                    {expandedSections.sorting ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                  <Typography variant="subtitle1">Sorting</Typography>
                </Box>
                <Collapse in={expandedSections.sorting}>
                  <SortPanel
                    sort={sort}
                    selectedFields={selectedFields}
                    onSortChange={setSort}
                  />
                </Collapse>
              </Box>
            </Box>
          )}

          {/* Step 4: Report Preview and Export */}
          {activeStep === 4 && (
            <ReportPreview
              rows={reportRows}
              selectedFields={selectedFields}
              reportName={reportName}
              onRefresh={handleGenerateReport}
              isLoading={false}
            />
          )}

          {/* Navigation buttons */}
          <Box display="flex" justifyContent="space-between" mt={2}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              variant="outlined"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={activeStep === BUILDER_STEPS.length - 1}
              variant="contained"
            >
              {activeStep === BUILDER_STEPS.length - 2 ? 'Generate Report' : 'Next'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportBuilderPage;
