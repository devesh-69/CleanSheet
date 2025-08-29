import { ComparisonOptions, DuplicateResult, ParsedFile } from '../types';

const generateCompositeKey = (row: Record<string, any>, columns: string[], options: ComparisonOptions): string => {
  return columns
    .map((col) => {
      let value = row[col] !== null && row[col] !== undefined ? String(row[col]) : '';
      if (options.trimWhitespace) {
        value = value.trim();
      }
      if (options.ignoreSpecialChars) {
        value = value.replace(/[^a-zA-Z0-9]/g, '');
      }
      if (!options.caseSensitive) {
        value = value.toLowerCase();
      }
      return value;
    })
    .join('||');
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

export const findDuplicates = (
  mainFile: ParsedFile,
  comparisonFile: ParsedFile,
  selectedColumns: string[],
  options: ComparisonOptions
): DuplicateResult => {
  
  if (selectedColumns.length === 0) {
    return { duplicates: [], cleanedData: comparisonFile.data, totalDuplicates: 0, totalRowsProcessed: comparisonFile.rowCount };
  }

  // Step 1: Find duplicates within the comparison file itself.
  const intraFileResult = findDuplicatesInSingleFile(comparisonFile, selectedColumns, options);
  const internalDuplicates = intraFileResult.duplicates;
  const uniqueComparisonRows = intraFileResult.cleanedData;

  // Step 2: Create a set of keys from the main file for efficient lookup.
  const mainFileKeys = new Set<string>();
  for (const row of mainFile.data) {
    const key = generateCompositeKey(row, selectedColumns, options);
    mainFileKeys.add(key);
  }

  // Step 3: Compare the unique rows from the comparison file against the main file.
  const finalDuplicates = [...internalDuplicates];
  const finalCleanedData: Record<string, any>[] = [];

  for (const row of uniqueComparisonRows) {
    const key = generateCompositeKey(row, selectedColumns, options);
    if (mainFileKeys.has(key)) {
      // This row is unique within the comparison file, but exists in the main file.
      finalDuplicates.push(row);
    } else {
      // This row is unique to the comparison file.
      finalCleanedData.push(row);
    }
  }

  return {
    duplicates: finalDuplicates,
    cleanedData: finalCleanedData,
    totalDuplicates: finalDuplicates.length,
    totalRowsProcessed: comparisonFile.rowCount,
  };
};