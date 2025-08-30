import { SpecialCharsOptions, FindReplaceOptions, ParsedFile, ComparisonOptions, ColumnComparisonResult, SummaryOptions, SummaryFunction, Aggregation } from '../types';

const REGEX_SETS = {
    // Common punctuation characters
    punctuation: /[.,;:!?\-"'()[\]{}<>_]/g,
    // Common mathematical operators
    math: /[+\-*/=^%]/g,
    // Common currency symbols
    currency: /[$€£¥¢]/g,
    // Unicode property escapes for more reliable emoji matching
    emoji: /\p{Emoji}/gu,
    // Any character that is not a letter or a number
    notAlphanumeric: /[^a-zA-Z0-9]/g,
    // Any character that is not a letter
    notAlphabetic: /[^a-zA-Z]/g,
    // Any character that is not a number
    notNumeric: /[^0-9]/g,
};

export const removeSpecialChars = (
    originalData: Record<string, any>[],
    options: SpecialCharsOptions
): Record<string, any>[] => {
    
    if (options.selectedColumns.length === 0) return originalData;

    // Escape special regex characters in the custom string
    const customRegex = options.customChars 
        ? new RegExp(`[${options.customChars.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`, 'g')
        : null;

    return originalData.map(row => {
        const newRow = { ...row };
        for (const col of options.selectedColumns) {
            // Ensure we are working with a string
            let cellValue = newRow[col] !== null && newRow[col] !== undefined ? String(newRow[col]) : '';
            
            // Exclusive filter modes take priority
            switch (options.filterMode) {
                case 'alphanumeric':
                    cellValue = cellValue.replace(REGEX_SETS.notAlphanumeric, '');
                    break;
                case 'alphabetic':
                    cellValue = cellValue.replace(REGEX_SETS.notAlphabetic, '');
                    break;
                case 'numeric':
                    cellValue = cellValue.replace(REGEX_SETS.notNumeric, '');
                    break;
                case 'none':
                default:
                    // Apply standard removal options if no filter is active
                    if (options.removePunctuation) cellValue = cellValue.replace(REGEX_SETS.punctuation, '');
                    if (options.removeMath) cellValue = cellValue.replace(REGEX_SETS.math, '');
                    if (options.removeCurrency) cellValue = cellValue.replace(REGEX_SETS.currency, '');
                    if (options.removeEmoji) cellValue = cellValue.replace(REGEX_SETS.emoji, '');
                    if (customRegex) cellValue = cellValue.replace(customRegex, '');
                    break;
            }

            newRow[col] = cellValue;
        }
        return newRow;
    });
};

// Helper to escape regex special characters for safe use in new RegExp()
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const findAndReplace = (
    originalData: Record<string, any>[],
    options: FindReplaceOptions
): Record<string, any>[] => {
    if (options.selectedColumns.length === 0 || options.operations.length === 0) {
        return originalData;
    }

    // Filter out empty 'find' operations as they would replace everything
    const validOperations = options.operations.filter(op => op.find);

    if (validOperations.length === 0) {
        return originalData;
    }

    return originalData.map(row => {
        const newRow = { ...row };
        for (const col of options.selectedColumns) {
            let cellValue = newRow[col] !== null && newRow[col] !== undefined ? String(newRow[col]) : '';
            
            for (const op of validOperations) {
                if (options.matchEntireCell) {
                    const findVal = options.caseSensitive ? op.find : op.find.toLowerCase();
                    const cellCompareVal = options.caseSensitive ? cellValue : cellValue.toLowerCase();
                    if (cellCompareVal === findVal) {
                        cellValue = op.replace;
                    }
                } else {
                    const flags = options.caseSensitive ? 'g' : 'gi';
                    const regex = new RegExp(escapeRegExp(op.find), flags);
                    cellValue = cellValue.replace(regex, op.replace);
                }
            }
            newRow[col] = cellValue;
        }
        return newRow;
    });
};

export const mergeFiles = (
    files: ParsedFile[],
    options: { addSourceColumn: boolean }
): { mergedData: Record<string, any>[], mergedHeaders: string[] } => {
    if (files.length === 0) {
        return { mergedData: [], mergedHeaders: [] };
    }

    // Get the union of all headers from all files
    const allHeaders = new Set<string>();
    files.forEach(file => {
        file.headers.forEach(header => allHeaders.add(header));
    });

    if (options.addSourceColumn) {
        allHeaders.add('Source File');
    }

    const mergedHeaders = Array.from(allHeaders);
    const mergedData: Record<string, any>[] = [];

    files.forEach(file => {
        file.data.forEach(row => {
            const newRow: Record<string, any> = {};
            // Initialize all possible headers with a default value (e.g., empty string)
            mergedHeaders.forEach(header => {
                newRow[header] = '';
            });

            // Populate with data from the current row
            for (const key in row) {
                if (allHeaders.has(key)) {
                    newRow[key] = row[key];
                }
            }

            if (options.addSourceColumn) {
                newRow['Source File'] = file.name;
            }
            
            mergedData.push(newRow);
        });
    });

    return { mergedData, mergedHeaders };
};

export const compareColumns = (
    data: Record<string, any>[],
    columnA: string,
    columnB: string,
    options: ComparisonOptions
): ColumnComparisonResult => {
    const mismatches: Record<string, any>[] = [];

    for (const row of data) {
        let valueA = row[columnA] !== null && row[columnA] !== undefined ? String(row[columnA]) : '';
        let valueB = row[columnB] !== null && row[columnB] !== undefined ? String(row[columnB]) : '';

        if (options.trimWhitespace) {
            valueA = valueA.trim();
            valueB = valueB.trim();
        }
        
        if (options.ignoreSpecialChars) {
            valueA = valueA.replace(/[^a-zA-Z0-9]/g, '');
            valueB = valueB.replace(/[^a-zA-Z0-9]/g, '');
        }

        if (!options.caseSensitive) {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (valueA !== valueB) {
            mismatches.push(row);
        }
    }

    return {
        mismatches,
        totalMismatches: mismatches.length,
        totalRowsProcessed: data.length,
    };
};

export const generateSummaryReport = (
    data: Record<string, any>[],
    options: SummaryOptions
): { summaryData: Record<string, any>[], summaryHeaders: string[] } => {
    if (options.groupingColumns.length === 0 || options.aggregations.length === 0) {
        return { summaryData: [], summaryHeaders: [] };
    }

    const groupedData: Map<string, Record<string, any>[]> = new Map();

    // Group the data by a composite key from all grouping columns
    for (const row of data) {
        const groupKey = options.groupingColumns.map(col => row[col] ?? 'N/A').join('||');
        
        if (!groupedData.has(groupKey)) {
            groupedData.set(groupKey, []);
        }
        groupedData.get(groupKey)!.push(row);
    }

    const summaryData: Record<string, any>[] = [];
    
    // Dynamically create headers
    const aggregationHeaders = options.aggregations.map(agg => {
        const funcName = agg.function.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (agg.function === 'count') return 'Count';
        return `${funcName} of ${agg.column}`;
    });

    const summaryHeaders = [...options.groupingColumns, ...aggregationHeaders];
    const uniqueHeaders = [...new Set(summaryHeaders)];


    for (const [groupKey, rows] of groupedData.entries()) {
        const summaryRow: Record<string, any> = {};

        // Add grouping column values to the summary row
        const keyParts = groupKey.split('||');
        options.groupingColumns.forEach((col, index) => {
            summaryRow[col] = keyParts[index];
        });

        // Perform all aggregations for the current group
        for (const agg of options.aggregations) {
            const values = rows.map(r => r[agg.column]);
            const headerName = aggregationHeaders[options.aggregations.indexOf(agg)];

            switch (agg.function) {
                case 'count':
                    // Count all rows in the group
                    summaryRow['Count'] = rows.length;
                    break;
                case 'count_unique':
                    summaryRow[headerName] = new Set(values.filter(v => v !== null && v !== undefined)).size;
                    break;
                default:
                    // For numeric functions, filter out non-numeric values
                    const numericValues = values
                        .map(v => parseFloat(String(v)))
                        .filter(v => !isNaN(v) && isFinite(v));

                    if (numericValues.length === 0) {
                        summaryRow[headerName] = 0; // or null/N/A
                        continue;
                    }

                    switch (agg.function) {
                        case 'sum':
                            summaryRow[headerName] = numericValues.reduce((acc, v) => acc + v, 0);
                            break;
                        case 'average':
                            summaryRow[headerName] = numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length;
                            break;
                        case 'min':
                            summaryRow[headerName] = Math.min(...numericValues);
                            break;
                        case 'max':
                            summaryRow[headerName] = Math.max(...numericValues);
                            break;
                    }
                    break;
            }
        }
        summaryData.push(summaryRow);
    }

    return { summaryData, summaryHeaders: uniqueHeaders };
};
