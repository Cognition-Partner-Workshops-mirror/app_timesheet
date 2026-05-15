/**
 * SortPanel component for the Report Builder.
 * Allows users to configure sorting on a selected field
 * with ascending or descending direction.
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
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Sort as SortIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
} from '@mui/icons-material';
import type { ReportSort, SelectedField, SortDirection } from '../../types/reportBuilder';

interface SortPanelProps {
  /* Current sort configuration (null if disabled) */
  sort: ReportSort | null;
  /* Selected fields available for sorting */
  selectedFields: SelectedField[];
  /* Callback when sort configuration changes */
  onSortChange: (sort: ReportSort | null) => void;
}

const SortPanel: React.FC<SortPanelProps> = ({
  sort,
  selectedFields,
  onSortChange,
}) => {
  /* Toggle sorting on/off */
  const handleToggle = () => {
    if (sort) {
      onSortChange(null);
    } else if (selectedFields.length > 0) {
      /* Initialize with first selected field, ascending */
      onSortChange({
        fieldId: selectedFields[0].id,
        direction: 'asc',
      });
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <SortIcon color="action" />
          <Typography variant="h6">Sorting</Typography>
        </Box>
        {/* Toggle switch to enable/disable sorting */}
        <FormControlLabel
          control={
            <Switch
              checked={sort !== null}
              onChange={handleToggle}
              disabled={selectedFields.length === 0}
            />
          }
          label={sort ? 'Enabled' : 'Disabled'}
        />
      </Box>

      {sort && (
        <Box display="flex" gap={2} alignItems="center">
          {/* Sort field selector */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sort.fieldId}
              onChange={(e) =>
                onSortChange({ ...sort, fieldId: e.target.value })
              }
              label="Sort By"
            >
              {selectedFields.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort direction toggle (ascending/descending) */}
          <ToggleButtonGroup
            value={sort.direction}
            exclusive
            onChange={(_e, newDir) => {
              if (newDir) onSortChange({ ...sort, direction: newDir as SortDirection });
            }}
            size="small"
          >
            <ToggleButton value="asc">
              <AscIcon fontSize="small" sx={{ mr: 0.5 }} />
              Asc
            </ToggleButton>
            <ToggleButton value="desc">
              <DescIcon fontSize="small" sx={{ mr: 0.5 }} />
              Desc
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
    </Paper>
  );
};

export default SortPanel;
