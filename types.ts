export type ParsedFile = {
  name: string;
  size: number;
  headers: string[];
  data: Record<string, any>[];
  rowCount: number;
  columnCount: number;
  columnTypes: Record<string, DataType>;
};

export type ParsedSheet = {
    sheetName: string;
    headers: string[];
    data: Record<string, any>[];
    columnTypes: Record<string, DataType>;
};

export type ParsedWorkbook = {
    fileName: string;
    size: number;
    sheets: ParsedSheet[];
};

export enum DataType {
    String = 'String',
    Number = 'Number',
    Integer = 'Integer',
    Boolean = 'Boolean',
    Date = 'Date',
    Email = 'Email',
    URL = 'URL',
    PhoneNumber = 'Phone Number',
    Mixed = 'Mixed',
}

export type ComparisonOptions = {
  caseSensitive: boolean;
  trimWhitespace: boolean;
  ignoreSpecialChars: boolean;
  matchingMode: 'exact' | 'fuzzy' | 'phonetic';
  fuzzyThreshold: number; // 0 to 1
  primaryColumns: string[];
  secondaryColumns: string[];
};

export type DuplicateResult = {
  duplicates: Record<string, any>[];
  cleanedData: Record<string, any>[];
  totalDuplicates: number;
  totalRowsProcessed: number;
};

export enum AppStep {
  UPLOAD,
  PREVIEW,
  SELECT_COLUMNS,
  PROCESSING,
  RESULTS,
  ANALYZE_MERGE,
  RESOLVE_CONFLICTS,
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
  DASHBOARD_BUILDER = 'DASHBOARD_BUILDER',
  FORMAT_CONVERTER = 'FORMAT_CONVERTER',
  N_WAY_COMPARISON = 'N_WAY_COMPARISON',
  SMART_NORMALIZATION = 'SMART_NORMALIZATION',
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

export type ValidationRuleType = 
    | 'is_not_empty' 
    | 'is_unique' 
    | 'is_number' 
    | 'is_integer'
    | 'is_email' 
    | 'is_url' 
    | 'text_length_between'
    | 'matches_regex';

export type ValidationRule = {
    id: number;
    column: string;
    type: ValidationRuleType;
    min?: number;
    max?: number;
    regex?: string;
};

export type ValidationOptions = {
    rules: ValidationRule[];
};

export type ValidationResult = {
    invalidRows: Record<string, any>[];
    totalErrors: number;
    totalRowsProcessed: number;
};

export type DuplicateReportResult = {
    reportData: (Record<string, any> & {
        'Confidence Score'?: string;
        'Match Type'?: string;
    })[];
    totalDuplicateRows: number;
    totalDuplicateGroups: number;
    totalRowsProcessed: number;
};

export type NWayComparisonResult = {
    intersection: Record<string, any>[];
    differences: {
        fileName: string;
        data: Record<string, any>[];
    }[];
};

// --- Merge Tool Types ---
export type ColumnOverlap = {
  columnName: string;
  overlapPercentage: number; // 0-100
  uniqueValueRatio: number; // 0-1
};

export type MergeAnalysisReport = {
  commonColumns: ColumnOverlap[];
};

export type MergeConflict = {
    id: number; // For React keys
    primaryKeyValues: Record<string, any>;
    conflictingFields: {
        column: string;
        values: { fileName: string; value: any }[];
    }[];
};

export type MergeResolution = {
    conflictId: number;
    resolutions: Record<string, any>; // { [columnName]: resolvedValue }
};

export type MergeResult = {
    mergedData: Record<string, any>[];
    conflicts: MergeConflict[];
    mergedHeaders: string[];
};

// --- Smart Normalization Types ---
export type NormalizationFormat = 'phone_us' | 'date_iso' | 'date_us' | 'text_cleanup';

export type NormalizationRule = {
    id: number;
    selectedColumns: string[];
    format: NormalizationFormat;
};

export type NormalizationOptions = {
    rules: NormalizationRule[];
};

export type DataQualityReport = {
    before: number; // 0-100
    after: number;  // 0-100
};

// --- Dashboard Types ---
export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | '>' | '<' | '>=' | '<=';

export type DashboardFilter = {
    id: number;
    column: string;
    operator: FilterOperator;
    value: string;
};

export type DashboardSort = {
    column: string;
    direction: 'asc' | 'desc';
};

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter';
export type AggregationType = 'count' | 'sum' | 'average' | 'none';

export type ChartConfig = {
    type: ChartType;
    xAxisColumn: string;
    yAxisColumn: string;
    aggregation: AggregationType;
};