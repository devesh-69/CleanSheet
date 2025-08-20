
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