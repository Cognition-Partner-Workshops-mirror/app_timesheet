/**
 * Utility functions for the Report Builder feature.
 * Handles data processing, filtering, grouping, sorting,
 * and CSV export for generated reports.
 */

import type {
  ReportField,
  ReportFilter,
  ReportGrouping,
  ReportSort,
  ReportRow,
  SelectedField,
  AggregationType,
} from '../../types/reportBuilder';
import type { WorkEntryWithClient, Client } from '../../types/api';

/**
 * Available fields that can be selected for reports.
 * Maps timesheet data properties to report field definitions.
 */
export const AVAILABLE_FIELDS: ReportField[] = [
  { id: 'client_name', label: 'Client Name', type: 'string', category: 'Client' },
  { id: 'department', label: 'Department', type: 'string', category: 'Client' },
  { id: 'client_email', label: 'Client Email', type: 'string', category: 'Client' },
  { id: 'date', label: 'Work Date', type: 'date', category: 'Work Entry' },
  { id: 'hours', label: 'Hours', type: 'number', category: 'Work Entry' },
  { id: 'description', label: 'Description', type: 'string', category: 'Work Entry' },
  { id: 'created_at', label: 'Created At', type: 'date', category: 'Work Entry' },
];

/**
 * Default report configuration used when creating a new report.
 */
export const DEFAULT_REPORT_CONFIG = {
  name: '',
  description: '',
  selectedFields: [] as SelectedField[],
  filters: [] as ReportFilter[],
  grouping: null as ReportGrouping | null,
  sort: null as ReportSort | null,
};

/**
 * Transforms raw work entries and clients into flat report rows.
 * Joins client data onto each work entry for reporting purposes.
 *
 * @param entries - Array of work entries with client names
 * @param clients - Array of client records for additional fields
 * @returns Array of flat report row objects
 */
export function buildReportRows(
  entries: WorkEntryWithClient[],
  clients: Client[]
): ReportRow[] {
  /* Create a client lookup map for efficient joining */
  const clientMap = new Map<number, Client>();
  clients.forEach((c) => clientMap.set(c.id, c));

  return entries.map((entry) => {
    const client = clientMap.get(entry.client_id);
    return {
      client_name: entry.client_name || client?.name || 'Unknown',
      department: client?.department || '',
      client_email: client?.email || '',
      date: entry.date,
      hours: entry.hours,
      description: entry.description || '',
      created_at: entry.created_at,
    };
  });
}

/**
 * Applies filter conditions to report rows.
 * Multiple filters are combined with AND logic.
 *
 * @param rows - The data rows to filter
 * @param filters - Active filter conditions
 * @param fields - Field definitions for type-aware comparisons
 * @returns Filtered array of report rows
 */
export function applyFilters(
  rows: ReportRow[],
  filters: ReportFilter[],
  fields: ReportField[]
): ReportRow[] {
  if (filters.length === 0) return rows;

  return rows.filter((row) => {
    /* Every filter must pass (AND logic) */
    return filters.every((filter) => {
      const field = fields.find((f) => f.id === filter.fieldId);
      if (!field) return true;

      const cellValue = row[filter.fieldId];
      const filterValue = filter.value;

      switch (filter.operator) {
        case 'equals':
          return String(cellValue).toLowerCase() === filterValue.toLowerCase();

        case 'not_equals':
          return String(cellValue).toLowerCase() !== filterValue.toLowerCase();

        case 'contains':
          return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());

        case 'greater_than':
          if (field.type === 'number') {
            return Number(cellValue) > Number(filterValue);
          }
          return String(cellValue) > filterValue;

        case 'less_than':
          if (field.type === 'number') {
            return Number(cellValue) < Number(filterValue);
          }
          return String(cellValue) < filterValue;

        case 'between': {
          if (field.type === 'number') {
            const num = Number(cellValue);
            return num >= Number(filterValue) && num <= Number(filter.valueTo || filterValue);
          }
          /* Date/string between comparison */
          const val = String(cellValue);
          return val >= filterValue && val <= (filter.valueTo || filterValue);
        }

        case 'in': {
          /* Comma-separated list of accepted values */
          const acceptedValues = filterValue.split(',').map((v) => v.trim().toLowerCase());
          return acceptedValues.includes(String(cellValue).toLowerCase());
        }

        default:
          return true;
      }
    });
  });
}

/**
 * Groups report rows by a specified field and applies aggregations.
 * Produces one output row per unique group value.
 *
 * @param rows - The data rows to group
 * @param grouping - Grouping configuration with aggregation rules
 * @param selectedFields - Selected fields to determine output columns
 * @returns Aggregated report rows grouped by the specified field
 */
export function applyGrouping(
  rows: ReportRow[],
  grouping: ReportGrouping,
  selectedFields: SelectedField[]
): ReportRow[] {
  /* Collect rows into groups by the grouping field value */
  const groups = new Map<string, ReportRow[]>();
  rows.forEach((row) => {
    const key = String(row[grouping.fieldId] ?? 'Unknown');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  /* Build one aggregated row per group */
  const result: ReportRow[] = [];
  groups.forEach((groupRows, groupKey) => {
    const outputRow: ReportRow = {};
    outputRow[grouping.fieldId] = groupKey;

    selectedFields.forEach((field) => {
      if (field.id === grouping.fieldId) return;

      /* Find aggregation config for this field */
      const aggConfig = grouping.aggregations.find((a) => a.fieldId === field.id);

      if (aggConfig && field.type === 'number') {
        /* Apply the specified aggregation function */
        outputRow[field.id] = computeAggregation(
          groupRows.map((r) => Number(r[field.id] || 0)),
          aggConfig.type
        );
      } else if (field.type === 'number') {
        /* Default to sum for ungrouped numeric fields */
        outputRow[field.id] = computeAggregation(
          groupRows.map((r) => Number(r[field.id] || 0)),
          'sum'
        );
      } else {
        /* For non-numeric fields, take the first value in the group */
        outputRow[field.id] = groupRows[0]?.[field.id] ?? '';
      }
    });

    result.push(outputRow);
  });

  return result;
}

/**
 * Computes an aggregation over a set of numeric values.
 *
 * @param values - Array of numbers to aggregate
 * @param type - Aggregation function to apply
 * @returns The computed aggregation result
 */
function computeAggregation(values: number[], type: AggregationType): number {
  if (values.length === 0) return 0;

  switch (type) {
    case 'sum':
      return parseFloat(values.reduce((a, b) => a + b, 0).toFixed(2));
    case 'avg':
      return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    default:
      return 0;
  }
}

/**
 * Sorts report rows by the specified field and direction.
 *
 * @param rows - The data rows to sort
 * @param sort - Sort configuration (field and direction)
 * @param fields - Field definitions for type-aware sorting
 * @returns Sorted array of report rows (new array, does not mutate input)
 */
export function applySorting(
  rows: ReportRow[],
  sort: ReportSort,
  fields: ReportField[]
): ReportRow[] {
  const field = fields.find((f) => f.id === sort.fieldId);
  if (!field) return rows;

  return [...rows].sort((a, b) => {
    const aVal = a[sort.fieldId];
    const bVal = b[sort.fieldId];

    let comparison = 0;
    if (field.type === 'number') {
      comparison = Number(aVal || 0) - Number(bVal || 0);
    } else {
      comparison = String(aVal || '').localeCompare(String(bVal || ''));
    }

    return sort.direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * Generates the complete report by applying filters, grouping, and sorting
 * to the raw data rows in sequence.
 *
 * @param rows - Raw data rows from the data source
 * @param selectedFields - Fields selected for the report
 * @param filters - Active filter conditions
 * @param grouping - Grouping configuration (null for no grouping)
 * @param sort - Sort configuration (null for default ordering)
 * @returns Processed report rows ready for display
 */
export function generateReport(
  rows: ReportRow[],
  selectedFields: SelectedField[],
  filters: ReportFilter[],
  grouping: ReportGrouping | null,
  sort: ReportSort | null
): ReportRow[] {
  const fields = selectedFields as ReportField[];

  /* Step 1: Apply filters to narrow down data */
  let result = applyFilters(rows, filters, fields);

  /* Step 2: Apply grouping and aggregations if configured */
  if (grouping) {
    result = applyGrouping(result, grouping, selectedFields);
  }

  /* Step 3: Apply sorting if configured */
  if (sort) {
    result = applySorting(result, sort, fields);
  }

  return result;
}

/**
 * Exports report data as a CSV file and triggers browser download.
 * Handles special characters in cell values by quoting fields that
 * contain commas, quotes, or newlines.
 *
 * @param rows - Report data rows to export
 * @param selectedFields - Selected fields defining CSV columns
 * @param reportName - Name used for the downloaded file
 */
export function exportToCsv(
  rows: ReportRow[],
  selectedFields: SelectedField[],
  reportName: string
): void {
  const visibleFields = selectedFields.filter((f) => f.visible);

  /* Build CSV header row from field labels */
  const header = visibleFields.map((f) => escapeCsvValue(f.label)).join(',');

  /* Build CSV data rows */
  const dataRows = rows.map((row) =>
    visibleFields.map((f) => escapeCsvValue(String(row[f.id] ?? ''))).join(',')
  );

  const csvContent = [header, ...dataRows].join('\n');

  /* Create blob and trigger browser download */
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportName || 'report'}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes a CSV cell value by wrapping in quotes if it contains
 * commas, double quotes, or newlines. Internal quotes are doubled.
 *
 * @param value - Raw cell value
 * @returns CSV-safe escaped value
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formats a cell value for display in the report preview table.
 * Applies type-specific formatting (dates, numbers).
 *
 * @param value - Raw cell value
 * @param fieldType - The field's data type for formatting rules
 * @returns Formatted string for display
 */
export function formatCellValue(value: string | number | null, fieldType: string): string {
  if (value === null || value === undefined || value === '') return '—';

  if (fieldType === 'date') {
    try {
      return new Date(String(value)).toLocaleDateString();
    } catch {
      return String(value);
    }
  }

  if (fieldType === 'number') {
    const num = Number(value);
    return isNaN(num) ? String(value) : num.toFixed(2);
  }

  return String(value);
}
