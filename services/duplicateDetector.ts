import { ComparisonOptions, DuplicateResult, ParsedFile, DuplicateReportResult } from '../types';

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

export const findUniqueAndCommonRows = (
  mainFile: ParsedFile,
  comparisonFile: ParsedFile,
  selectedColumns: string[],
  options: ComparisonOptions
): DuplicateResult => {
  
  if (selectedColumns.length === 0) {
    // Treat all rows as unique if no columns are selected for comparison
    return { duplicates: [], cleanedData: comparisonFile.data, totalDuplicates: 0, totalRowsProcessed: comparisonFile.rowCount };
  }

  // Step 1: Find duplicates within the comparison file itself. These are guaranteed common rows.
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
  const commonRows = [...internalDuplicates];
  const uniqueRows: Record<string, any>[] = [];

  for (const row of uniqueComparisonRows) {
    const key = generateCompositeKey(row, selectedColumns, options);
    if (mainFileKeys.has(key)) {
      // This row is unique within the comparison file, but exists in the main file.
      commonRows.push(row);
    } else {
      // This row is unique to the comparison file.
      uniqueRows.push(row);
    }
  }

  return {
    duplicates: commonRows, // "duplicates" property now holds common rows
    cleanedData: uniqueRows,  // "cleanedData" property now holds unique rows
    totalDuplicates: commonRows.length,
    totalRowsProcessed: comparisonFile.rowCount,
  };
};

export const generateDuplicateReport = (
  file: ParsedFile,
  selectedColumns: string[],
  options: ComparisonOptions
): DuplicateReportResult => {
    if (selectedColumns.length === 0) {
        return { reportData: [], totalDuplicateRows: 0, totalDuplicateGroups: 0, totalRowsProcessed: file.rowCount };
    }

    const keyToRowsMap = new Map<string, Record<string, any>[]>();

    // Group rows by composite key
    for (const row of file.data) {
        const key = generateCompositeKey(row, selectedColumns, options);
        if (!keyToRowsMap.has(key)) {
            keyToRowsMap.set(key, []);
        }
        keyToRowsMap.get(key)!.push(row);
    }
    
    const duplicateOnlyReport: Record<string, any>[] = [];
    let duplicateGroupId = 1;
    let totalDuplicateRows = 0;
    let totalDuplicateGroups = 0;

    // Process groups to build the report, only including groups with more than one member
    for (const rows of keyToRowsMap.values()) {
        if (rows.length > 1) {
            totalDuplicateGroups++;
            totalDuplicateRows += rows.length;
            rows.forEach((row, index) => {
                duplicateOnlyReport.push({
                    'Duplicate Group ID': duplicateGroupId,
                    'Is Original': index === 0 ? 'Yes' : 'No',
                    ...row,
                });
            });
            duplicateGroupId++;
        }
    }

    return {
        reportData: duplicateOnlyReport,
        totalDuplicateRows,
        totalDuplicateGroups,
        totalRowsProcessed: file.rowCount,
    };
};
