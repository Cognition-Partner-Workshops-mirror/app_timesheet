/**
 * GroupingPanel component for the Report Builder.
 * Allows users to group report data by a selected field
 * and configure aggregation functions for numeric columns.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Grid,
} from '@mui/material';
import { GroupWork as GroupIcon } from '@mui/icons-material';
import type {
  ReportGrouping,
  SelectedField,
  AggregationType,
} from '../../types/reportBuilder';

interface GroupingPanelProps {
  /* Current grouping configuration (null if disabled) */
  grouping: ReportGrouping | null;
  /* Selected fields available for grouping */
  selectedFields: SelectedField[];
  /* Callback when grouping configuration changes */
  onGroupingChange: (grouping: ReportGrouping | null) => void;
}

/* Available aggregation options for numeric fields within groups */
const AGGREGATION_OPTIONS: { value: AggregationType; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

const GroupingPanel: React.FC<GroupingPanelProps> = ({
  grouping,
  selectedFields,
  onGroupingChange,
}) => {
  /* Filter to only string/date fields suitable for grouping */
  const groupableFields = selectedFields.filter(
    (f) => f.type === 'string' || f.type === 'date'
  );

  /* Filter to only numeric fields that can be aggregated */
  const numericFields = selectedFields.filter((f) => f.type === 'number');

  /* Toggle grouping on/off */
  const handleToggle = () => {
    if (grouping) {
      onGroupingChange(null);
    } else if (groupableFields.length > 0) {
      /* Initialize with first available groupable field */
      onGroupingChange({
        fieldId: groupableFields[0].id,
        aggregations: numericFields.map((f) => ({
          fieldId: f.id,
          type: 'sum' as AggregationType,
        })),
      });
    }
  };

  /* Update the field being grouped by */
  const handleFieldChange = (fieldId: string) => {
    if (!grouping) return;
    onGroupingChange({ ...grouping, fieldId });
  };

  /* Update the aggregation type for a specific numeric field */
  const handleAggregationChange = (fieldId: string, type: AggregationType) => {
    if (!grouping) return;
    const updatedAggs = grouping.aggregations.map((agg) =>
      agg.fieldId === fieldId ? { ...agg, type } : agg
    );
    onGroupingChange({ ...grouping, aggregations: updatedAggs });
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <GroupIcon color="action" />
          <Typography variant="h6">Grouping</Typography>
        </Box>
        {/* Toggle switch to enable/disable grouping */}
        <FormControlLabel
          control={
            <Switch
              checked={grouping !== null}
              onChange={handleToggle}
              disabled={groupableFields.length === 0}
            />
          }
          label={grouping ? 'Enabled' : 'Disabled'}
        />
      </Box>

      {groupableFields.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Select at least one text or date field to enable grouping.
        </Typography>
      )}

      {grouping && (
        <Box>
          {/* Group-by field selector */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Group By</InputLabel>
            <Select
              value={grouping.fieldId}
              onChange={(e) => handleFieldChange(e.target.value)}
              label="Group By"
            >
              {groupableFields.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Aggregation settings for each numeric field */}
          {numericFields.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Aggregations
              </Typography>
              <Grid container spacing={2}>
                {numericFields.map((field) => {
                  const currentAgg = grouping.aggregations.find(
                    (a) => a.fieldId === field.id
                  );
                  return (
                    <Grid size={{ xs: 12, sm: 6 }} key={field.id}>
                      <Box
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="body2">{field.label}</Typography>
                          <Chip
                            label={currentAgg?.type || 'sum'}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                        <FormControl fullWidth size="small">
                          <Select
                            value={currentAgg?.type || 'sum'}
                            onChange={(e) =>
                              handleAggregationChange(
                                field.id,
                                e.target.value as AggregationType
                              )
                            }
                          >
                            {AGGREGATION_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default GroupingPanel;
