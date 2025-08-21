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
  COMPARE_FILES = 'COMPARE_FILES',
  SINGLE_FILE_DUPLICATES = 'SINGLE_FILE_DUPLICATES',
  SPECIAL_CHARS = 'SPECIAL_CHARS',
  FIND_REPLACE = 'FIND_REPLACE',
  MERGE_FILES = 'MERGE_FILES',
  COMPARE_COLUMNS = 'COMPARE_COLUMNS',
  QUICK_SUMMARY = 'QUICK_SUMMARY',
  DATA_VALIDATION = 'DATA_VALIDATION',
  EXPORT_DUPLICATES = 'EXPORT_DUPLICATES',
}
