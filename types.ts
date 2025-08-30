export type ParsedFile = {
  name: string;
  size: number;
  headers: string[];
  data: Record<string, any>[];
  rowCount: number;
  columnCount: number;
};

export type ComparisonOptions = {
  caseSensitive: boolean;
  trimWhitespace: boolean;
  ignoreSpecialChars: boolean;
};

export type DuplicateResult = {
  duplicates: Record<string, any>[];
  cleanedData: Record<string, any>[];
  totalDuplicates: number;
  totalRowsProcessed: number;
};

export enum AppStep {
  UPLOAD,
  SELECT_COLUMNS,
  PROCESSING,
  RESULTS,
}

export enum Tool {
  FIND_UNIQUE_ROWS = 'FIND_UNIQUE_ROWS',
  SINGLE_FILE_DUPLICATES = 'SINGLE_FILE_DUPLICATES',
  SPECIAL_CHARS = 'SPECIAL_CHARS',
  FIND_REPLACE = 'FIND_REPLACE',
  MERGE_FILES = 'MERGE_FILES',
  COMPARE_COLUMNS = 'COMPARE_COLUMNS',
  QUICK_SUMMARY = 'QUICK_SUMMARY',
  DATA_VALIDATION = 'DATA_VALIDATION',
  EXPORT_DUPLICATES = 'EXPORT_DUPLICATES',
}

export type SpecialCharsOptions = {
    selectedColumns: string[];
    removePunctuation: boolean;
    removeMath: boolean;
    removeCurrency: boolean;
    removeEmoji: boolean;
    // Filters are mutually exclusive
    filterMode: 'none' | 'alphanumeric' | 'alphabetic' | 'numeric';
    customChars: string;
};

export type FindReplaceOperation = {
  id: number; // For React keys
  find: string;
  replace: string;
};

export type FindReplaceOptions = {
    selectedColumns: string[];
    operations: FindReplaceOperation[];
    caseSensitive: boolean;
    matchEntireCell: boolean;
};

export type ColumnComparisonResult = {
    mismatches: Record<string, any>[];
    totalMismatches: number;
    totalRowsProcessed: number;
};

export type SummaryFunction = 'count' | 'count_unique' | 'sum' | 'average' | 'min' | 'max';

export type Aggregation = {
  id: number; // For React keys
  column: string;
  function: SummaryFunction;
};

export type SummaryOptions = {
    groupingColumns: string[];
    aggregations: Aggregation[];
};
