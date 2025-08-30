import { SpecialCharsOptions, FindReplaceOptions, ParsedFile, ComparisonOptions, ColumnComparisonResult, SummaryOptions, SummaryFunction, Aggregation, MergeAnalysisReport, ColumnOverlap, MergeResult, MergeConflict, NormalizationOptions } from '../types';

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

export const analyzeMergeability = (files: ParsedFile[]): MergeAnalysisReport => {
    if (files.length < 2) return { commonColumns: [] };

    const headerSets = files.map(f => new Set(f.headers));
    const firstSet = headerSets[0];
    const commonHeaders = Array.from(firstSet).filter(header => headerSets.every(set => set.has(header)));

    const commonColumns: ColumnOverlap[] = commonHeaders.map(header => {
        const valueSets = files.map(f => new Set(f.data.map(row => row[header])));
        
        let intersection = new Set(valueSets[0]);
        for (let i = 1; i < valueSets.length; i++) {
            intersection = new Set([...intersection].filter(x => valueSets[i].has(x)));
        }

        const allValues = new Set();
        files.forEach(f => f.data.forEach(row => allValues.add(row[header])));
        
        const overlapPercentage = allValues.size > 0 ? (intersection.size / allValues.size) * 100 : 0;
        
        const totalValues = files.reduce((sum, f) => sum + f.data.length, 0);
        const uniqueValueRatio = totalValues > 0 ? allValues.size / totalValues : 0;

        return {
            columnName: header,
            overlapPercentage: Math.round(overlapPercentage),
            uniqueValueRatio: parseFloat(uniqueValueRatio.toFixed(2))
        };
    }).sort((a, b) => b.overlapPercentage - a.overlapPercentage || b.uniqueValueRatio - a.uniqueValueRatio);

    return { commonColumns };
};


export const mergeFiles = (
    files: ParsedFile[],
    primaryKeyColumns: string[],
    options: { addSourceColumn: boolean }
): MergeResult => {
    if (files.length === 0) {
        return { mergedData: [], conflicts: [], mergedHeaders: [] };
    }

    const allHeaders = new Set<string>();
    files.forEach(file => file.headers.forEach(header => allHeaders.add(header)));
    if (options.addSourceColumn) allHeaders.add('Source File');

    const mergedDataMap = new Map<string, Record<string, any>>();
    const conflictsMap = new Map<string, MergeConflict>();
    let conflictIdCounter = 0;

    const generateKey = (row: Record<string, any>) => primaryKeyColumns.map(col => row[col] ?? '').join('||');

    files.forEach(file => {
        file.data.forEach(row => {
            const key = generateKey(row);
            if (key === '' || primaryKeyColumns.length === 0) return;

            if (!mergedDataMap.has(key)) {
                // First time seeing this key
                const newRow = { ...row };
                if (options.addSourceColumn) newRow['Source File'] = file.name;
                mergedDataMap.set(key, newRow);
            } else {
                // Key already exists, check for conflicts
                const existingRow = mergedDataMap.get(key)!;
                let hasConflict = false;

                const primaryKeyValues = primaryKeyColumns.reduce((acc, col) => ({...acc, [col]: row[col]}), {});
                let conflict = conflictsMap.get(key) || {
                    id: conflictIdCounter,
                    primaryKeyValues,
                    conflictingFields: [],
                };
                
                allHeaders.forEach(header => {
                    if (primaryKeyColumns.includes(header) || header === 'Source File') return;

                    const existingValue = existingRow[header];
                    const newValue = row[header];
                    
                    if (String(existingValue) !== String(newValue) && (existingValue !== undefined && existingValue !== null) && (newValue !== undefined && newValue !== null)) {
                        hasConflict = true;
                        let fieldConflict = conflict.conflictingFields.find(f => f.column === header);
                        if (!fieldConflict) {
                            fieldConflict = {
                                column: header,
                                values: [{ fileName: existingRow['Source File'] || files[0].name, value: existingValue }],
                            };
                            conflict.conflictingFields.push(fieldConflict);
                        }
                        fieldConflict.values.push({ fileName: file.name, value: newValue });
                    }
                });
                
                if (hasConflict) {
                    if (!conflictsMap.has(key)) {
                        conflictsMap.set(key, conflict);
                        conflictIdCounter++;
                    }
                    mergedDataMap.delete(key);
                }
            }
        });
    });

    const conflicts = Array.from(conflictsMap.values());
    conflicts.forEach(conflict => {
        conflict.conflictingFields.forEach(field => {
            const seen = new Set();
            field.values = field.values.filter(v => {
                const k = `${v.fileName}:${v.value}`;
                return seen.has(k) ? false : seen.add(k);
            });
             // If after deduplication there is only one option, it's not a conflict.
            if (new Set(field.values.map(v => v.value)).size <= 1) {
                return true; // This will be filtered out below
            }
            return false;
        });
        conflict.conflictingFields = conflict.conflictingFields.filter(f => f.values.length > 1);
    });
    
    return {
        mergedData: Array.from(mergedDataMap.values()),
        conflicts: conflicts.filter(c => c.conflictingFields.length > 0),
        mergedHeaders: Array.from(allHeaders)
    };
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

// --- Smart Normalization Functions ---

const normalizePhoneNumberUS = (value: string): string => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
    }
    if (digits.length === 11 && digits.startsWith('1')) {
        return `(${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7, 11)}`;
    }
    return String(value); // Return original if not a standard US number
};

const normalizeDate = (value: string, format: 'iso' | 'us'): string => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return String(value); // Return original if invalid date
    }
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    if (format === 'iso') {
        return `${year}-${month}-${day}`;
    } else { // 'us'
        return `${month}/${day}/${year}`;
    }
};

const normalizeTextCleanup = (value: string): string => {
    if (!value) return '';
    return String(value).trim().replace(/\s+/g, ' ');
};

export const normalizeData = (
    originalData: Record<string, any>[],
    options: NormalizationOptions
): Record<string, any>[] => {
    if (options.rules.length === 0) return originalData;

    return originalData.map(row => {
        const newRow = { ...row };
        for (const rule of options.rules) {
            for (const column of rule.selectedColumns) {
                const originalValue = newRow[column];
                if (originalValue === null || originalValue === undefined) continue;

                let newValue = String(originalValue);
                switch (rule.format) {
                    case 'phone_us':
                        newValue = normalizePhoneNumberUS(newValue);
                        break;
                    case 'date_iso':
                        newValue = normalizeDate(newValue, 'iso');
                        break;
                    case 'date_us':
                        newValue = normalizeDate(newValue, 'us');
                        break;
                    case 'text_cleanup':
                        newValue = normalizeTextCleanup(newValue);
                        break;
                }
                newRow[column] = newValue;
            }
        }
        return newRow;
    });
};