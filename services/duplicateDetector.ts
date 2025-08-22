import { ComparisonOptions, DuplicateResult, ParsedFile } from '../types';

const generateCompositeKey = (row: Record<string, any>, columns: string[], options: ComparisonOptions): string => {
  return columns
    .map((col) => {
      let value = row[col] !== null && row[col] !== undefined ? String(row[col]) : '';
      if (options.trimWhitespace) {
        value = value.trim();
      }
      if (!options.caseSensitive) {
        value = value.toLowerCase();
      }
      return value;
    })
    .join('||');
};

export const findDuplicates = (
  mainFile: ParsedFile,
  comparisonFile: ParsedFile,
  selectedColumns: string[],
  options: ComparisonOptions
): DuplicateResult => {
  
  if (selectedColumns.length === 0) {
    return { duplicates: [], cleanedData: comparisonFile.data, totalDuplicates: 0, totalRowsProcessed: comparisonFile.rowCount };
  }

  const mainFileKeys = new Set<string>();
  for (const row of mainFile.data) {
    const key = generateCompositeKey(row, selectedColumns, options);
    mainFileKeys.add(key);
  }

  const duplicates: Record<string, any>[] = [];
  const cleanDataCandidates: Record<string, any>[] = [];

  // First, separate rows from the comparison file into two groups:
  // 1. Duplicates: rows that are also present in the main file.
  // 2. Clean Data Candidates: rows that are not in the main file.
  for (const row of comparisonFile.data) {
    const key = generateCompositeKey(row, selectedColumns, options);
    if (mainFileKeys.has(key)) {
      duplicates.push(row);
    } else {
      cleanDataCandidates.push(row);
    }
  }

  // Second, process the clean data candidates to remove any intra-file duplicates from this set.
  const cleanedData: Record<string, any>[] = [];
  const cleanedDataKeys = new Set<string>();
  for (const row of cleanDataCandidates) {
    const key = generateCompositeKey(row, selectedColumns, options);
    if (!cleanedDataKeys.has(key)) {
      cleanedData.push(row);
      cleanedDataKeys.add(key);
    }
  }

  return {
    duplicates,
    cleanedData,
    totalDuplicates: duplicates.length,
    totalRowsProcessed: comparisonFile.rowCount,
  };
};

export const findDuplicatesInSingleFile = (
  file: ParsedFile,
  selectedColumns: string[],
  options: ComparisonOptions
): DuplicateResult => {
  if (selectedColumns.length === 0) {
    // If no columns are selected, consider everything unique.
    return { duplicates: [], cleanedData: file.data, totalDuplicates: 0, totalRowsProcessed: file.rowCount };
  }

  const duplicates: Record<string, any>[] = [];
  const cleanedData: Record<string, any>[] = [];
  const seenKeys = new Set<string>();

  for (const row of file.data) {
    const key = generateCompositeKey(row, selectedColumns, options);
    if (seenKeys.has(key)) {
      duplicates.push(row);
    } else {
      cleanedData.push(row);
      seenKeys.add(key);
    }
  }

  return {
    duplicates,
    cleanedData,
    totalDuplicates: duplicates.length,
    totalRowsProcessed: file.rowCount,
  };
};
