/**
 * FieldSelector component for the Report Builder.
 * Displays available data fields grouped by category and allows
 * users to toggle fields on/off for inclusion in the report.
 */

import React from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { ReportField, SelectedField } from '../../types/reportBuilder';

interface FieldSelectorProps {
  /* All available fields that can be selected */
  availableFields: ReportField[];
  /* Currently selected fields */
  selectedFields: SelectedField[];
  /* Callback when field selection changes */
  onFieldToggle: (field: ReportField) => void;
}

const FieldSelector: React.FC<FieldSelectorProps> = ({
  availableFields,
  selectedFields,
  onFieldToggle,
}) => {
  /* Group available fields by their category for organized display */
  const categories = availableFields.reduce<Record<string, ReportField[]>>((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {});

  /* Check if a field is currently selected */
  const isSelected = (fieldId: string): boolean =>
    selectedFields.some((f) => f.id === fieldId);

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Select Fields</Typography>
        {/* Show count of selected fields */}
        <Chip
          label={`${selectedFields.length} selected`}
          color="primary"
          size="small"
          variant="outlined"
        />
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Choose which columns to include in your report.
      </Typography>

      {/* Render each category as an expandable accordion */}
      {Object.entries(categories).map(([category, fields]) => (
        <Accordion key={category} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">{category}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box display="flex" flexDirection="column" gap={0.5}>
              {fields.map((field) => (
                <FormControlLabel
                  key={field.id}
                  control={
                    <Checkbox
                      checked={isSelected(field.id)}
                      onChange={() => onFieldToggle(field)}
                      size="small"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2">{field.label}</Typography>
                      {/* Display the field data type as a small chip */}
                      <Chip label={field.type} size="small" variant="outlined" />
                    </Box>
                  }
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Paper>
  );
};

export default FieldSelector;
