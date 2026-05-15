/**
 * Type definitions for the Report Builder feature.
 * Defines the configuration schema for building custom reports
 * including field selection, filters, grouping, and sorting.
 */

/* Supported data types for report fields */
export type FieldType = 'string' | 'number' | 'date';

/* Supported aggregation functions for numeric fields */
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max';

/* Sort direction for report output */
export type SortDirection = 'asc' | 'desc';

/* Filter comparison operators */
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in';

/**
 * Represents an available data field that can be added to a report.
 * Each field maps to a column in the underlying data source.
 */
export interface ReportField {
  /* Unique key matching the data property name (e.g., 'client_name') */
  id: string;
  /* Human-readable label displayed in the UI */
  label: string;
  /* Data type used for formatting and filter operator selection */
  type: FieldType;
  /* Category grouping for the field selector panel */
  category: string;
}

/**
 * A field that has been selected for inclusion in the report.
 * Extends ReportField with display and aggregation options.
 */
export interface SelectedField extends ReportField {
  /* Whether this field is visible in the report output */
  visible: boolean;
  /* Optional aggregation function (only applicable for numeric fields) */
  aggregation?: AggregationType;
}

/**
 * A filter condition applied to narrow down report data.
 * Multiple filters are combined with AND logic.
 */
export interface ReportFilter {
  /* Unique identifier for this filter instance */
  id: string;
  /* The field ID this filter applies to */
  fieldId: string;
  /* Comparison operator */
  operator: FilterOperator;
  /* Primary filter value */
  value: string;
  /* Secondary value used for 'between' operator */
  valueTo?: string;
}

/**
 * Grouping configuration to aggregate report rows by a field.
 */
export interface ReportGrouping {
  /* The field ID to group by */
  fieldId: string;
  /* Aggregations to apply to numeric fields within each group */
  aggregations: { fieldId: string; type: AggregationType }[];
}

/**
 * Sort configuration for report output ordering.
 */
export interface ReportSort {
  /* The field ID to sort by */
  fieldId: string;
  /* Sort direction */
  direction: SortDirection;
}

/**
 * Complete report configuration containing all builder settings.
 * This object represents a full report definition that can be
 * saved, loaded, and executed to generate report output.
 */
export interface ReportConfig {
  /* User-defined report name */
  name: string;
  /* Optional description of the report's purpose */
  description: string;
  /* Fields selected for the report (order determines column order) */
  selectedFields: SelectedField[];
  /* Active filter conditions */
  filters: ReportFilter[];
  /* Grouping configuration (null if no grouping) */
  grouping: ReportGrouping | null;
  /* Sort configuration (null for default ordering) */
  sort: ReportSort | null;
}

/**
 * A single row of report output data.
 * Keys correspond to field IDs, values are the formatted data.
 */
export type ReportRow = Record<string, string | number | null>;

/**
 * Complete report output including metadata and data rows.
 */
export interface ReportOutput {
  /* The configuration used to generate this report */
  config: ReportConfig;
  /* The generated data rows */
  rows: ReportRow[];
  /* Total number of rows before any pagination */
  totalRows: number;
  /* Timestamp when the report was generated */
  generatedAt: string;
}
