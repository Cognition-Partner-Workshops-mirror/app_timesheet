/**
 * ReportPreview component for the Report Builder.
 * Displays the generated report data in a formatted table
 * with summary statistics and export options.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  Refresh as RefreshIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';
import type { ReportRow, SelectedField } from '../../types/reportBuilder';
import { formatCellValue, exportToCsv } from './reportBuilderUtils';

interface ReportPreviewProps {
  /* Generated report data rows */
  rows: ReportRow[];
  /* Selected fields defining the table columns */
  selectedFields: SelectedField[];
  /* Report name used for the export file name */
  reportName: string;
  /* Callback to regenerate the report */
  onRefresh: () => void;
  /* Whether the report is currently being generated */
  isLoading: boolean;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({
  rows,
  selectedFields,
  reportName,
  onRefresh,
  isLoading,
}) => {
  /* Only show visible fields as table columns */
  const visibleFields = selectedFields.filter((f) => f.visible);

  /* Handle CSV export button click */
  const handleExport = () => {
    exportToCsv(rows, selectedFields, reportName);
  };

  return (
    <Paper sx={{ p: 2 }}>
      {/* Header with title, row count, and action buttons */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <TableIcon color="action" />
          <Typography variant="h6">Report Preview</Typography>
          <Chip
            label={`${rows.length} rows`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <Box display="flex" gap={1}>
          {/* Refresh button to regenerate the report */}
          <Button
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            variant="outlined"
            size="small"
            disabled={isLoading}
          >
            Refresh
          </Button>
          {/* Export to CSV button */}
          <Button
            startIcon={<ExportIcon />}
            onClick={handleExport}
            variant="contained"
            size="small"
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Show message when no fields are selected */}
      {visibleFields.length === 0 ? (
        <Alert severity="info">
          Select at least one field from the Field Selector to preview your report.
        </Alert>
      ) : rows.length === 0 ? (
        /* Show message when no data matches the current configuration */
        <Alert severity="warning">
          No data matches your current report configuration. Try adjusting your filters.
        </Alert>
      ) : (
        /* Report data table */
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {/* Render column headers from visible selected fields */}
                {visibleFields.map((field) => (
                  <TableCell
                    key={field.id}
                    sx={{
                      fontWeight: 'bold',
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    {field.label}
                    {/* Show aggregation badge if field has an aggregation configured */}
                    {field.aggregation && (
                      <Chip
                        label={field.aggregation.toUpperCase()}
                        size="small"
                        sx={{ ml: 1, height: 18, fontSize: '0.65rem', color: 'inherit' }}
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Render data rows with type-specific formatting */}
              {rows.map((row, index) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                  }}
                >
                  {visibleFields.map((field) => (
                    <TableCell key={field.id}>
                      {formatCellValue(row[field.id], field.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary statistics row displayed below the table */}
      {rows.length > 0 && visibleFields.some((f) => f.type === 'number') && (
        <Box mt={2} p={1.5} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Summary
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {/* Show totals for numeric columns */}
            {visibleFields
              .filter((f) => f.type === 'number')
              .map((field) => {
                const total = rows.reduce(
                  (sum, row) => sum + Number(row[field.id] || 0),
                  0
                );
                const avg = total / rows.length;
                return (
                  <Chip
                    key={field.id}
                    label={`${field.label}: Total ${total.toFixed(2)} | Avg ${avg.toFixed(2)}`}
                    variant="outlined"
                    color="primary"
                  />
                );
              })}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ReportPreview;
