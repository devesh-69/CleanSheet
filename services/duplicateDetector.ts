import { ComparisonOptions, DuplicateResult, ParsedFile } from '../types';

declare const XLSX: any;
declare const Papa: any;

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

export const exportFile = (data: Record<string, any>[], fileName: string, format: 'xlsx' | 'csv') => {
    if (data.length === 0) {
        // This case should be prevented by disabling the download buttons in the UI.
        console.warn("Export attempted with no data.");
        return;
    }

    if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
        XLSX.writeFile(workbook, fileName);
    } else if (format === 'csv') {
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};