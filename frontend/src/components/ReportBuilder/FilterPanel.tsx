/**
 * FilterPanel component for the Report Builder.
 * Allows users to add, configure, and remove filter conditions
 * that narrow down the data included in the report.
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import type { ReportFilter, SelectedField, FilterOperator } from '../../types/reportBuilder';

interface FilterPanelProps {
  /* Active filter conditions */
  filters: ReportFilter[];
  /* Selected fields available for filtering */
  selectedFields: SelectedField[];
  /* Callback to add a new filter */
  onAddFilter: () => void;
  /* Callback to update an existing filter */
  onUpdateFilter: (id: string, updates: Partial<ReportFilter>) => void;
  /* Callback to remove a filter */
  onRemoveFilter: (id: string) => void;
}

/**
 * Returns the set of valid filter operators based on field data type.
 * String fields support text-based operators; number/date fields
 * support numeric comparison operators.
 */
const getOperatorsForType = (
  type: string
): { value: FilterOperator; label: string }[] => {
  const common = [
    { value: 'equals' as FilterOperator, label: 'Equals' },
    { value: 'not_equals' as FilterOperator, label: 'Not Equals' },
  ];

  if (type === 'string') {
    return [
      ...common,
      { value: 'contains' as FilterOperator, label: 'Contains' },
      { value: 'in' as FilterOperator, label: 'In (comma-separated)' },
    ];
  }

  if (type === 'number' || type === 'date') {
    return [
      ...common,
      { value: 'greater_than' as FilterOperator, label: 'Greater Than' },
      { value: 'less_than' as FilterOperator, label: 'Less Than' },
      { value: 'between' as FilterOperator, label: 'Between' },
    ];
  }

  return common;
};

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  selectedFields,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
}) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterIcon color="action" />
          <Typography variant="h6">Filters</Typography>
        </Box>
        {/* Add filter button - disabled if no fields are selected yet */}
        <Button
          startIcon={<AddIcon />}
          onClick={onAddFilter}
          variant="outlined"
          size="small"
          disabled={selectedFields.length === 0}
        >
          Add Filter
        </Button>
      </Box>

      {filters.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No filters applied. Click "Add Filter" to narrow your data.
        </Typography>
      ) : (
        <Box display="flex" flexDirection="column" gap={2}>
          {filters.map((filter) => {
            /* Find the field definition for this filter's target field */
            const field = selectedFields.find((f) => f.id === filter.fieldId);
            const operators = field
              ? getOperatorsForType(field.type)
              : getOperatorsForType('string');

            return (
              <Box
                key={filter.id}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  {/* Field selector dropdown */}
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Field</InputLabel>
                      <Select
                        value={filter.fieldId}
                        onChange={(e) =>
                          onUpdateFilter(filter.id, {
                            fieldId: e.target.value,
                            operator: 'equals',
                            value: '',
                          })
                        }
                        label="Field"
                      >
                        {selectedFields.map((f) => (
                          <MenuItem key={f.id} value={f.id}>
                            {f.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Operator selector dropdown */}
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Operator</InputLabel>
                      <Select
                        value={filter.operator}
                        onChange={(e) =>
                          onUpdateFilter(filter.id, {
                            operator: e.target.value as FilterOperator,
                          })
                        }
                        label="Operator"
                      >
                        {operators.map((op) => (
                          <MenuItem key={op.value} value={op.value}>
                            {op.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Primary filter value input */}
                  <Grid size={{ xs: 12, sm: filter.operator === 'between' ? 2 : 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label={filter.operator === 'between' ? 'From' : 'Value'}
                      value={filter.value}
                      onChange={(e) =>
                        onUpdateFilter(filter.id, { value: e.target.value })
                      }
                      type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                      InputLabelProps={field?.type === 'date' ? { shrink: true } : undefined}
                    />
                  </Grid>

                  {/* Secondary value input for 'between' operator */}
                  {filter.operator === 'between' && (
                    <Grid size={{ xs: 12, sm: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="To"
                        value={filter.valueTo || ''}
                        onChange={(e) =>
                          onUpdateFilter(filter.id, { valueTo: e.target.value })
                        }
                        type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                        InputLabelProps={field?.type === 'date' ? { shrink: true } : undefined}
                      />
                    </Grid>
                  )}

                  {/* Delete filter button */}
                  <Grid size={{ xs: 12, sm: 1 }}>
                    <IconButton
                      onClick={() => onRemoveFilter(filter.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};

export default FilterPanel;
