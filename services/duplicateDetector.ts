import { ComparisonOptions, DuplicateResult, ParsedFile, DuplicateReportResult, NWayComparisonResult } from '../types';
import { calculateSimilarity, soundex } from './stringSimilarity';

const prepareValue = (value: any, options: Omit<ComparisonOptions, 'matchingMode' | 'fuzzyThreshold' | 'primaryColumns' | 'secondaryColumns'>): string => {
    let str = value !== null && value !== undefined ? String(value) : '';
    if (options.trimWhitespace) str = str.trim();
    if (options.ignoreSpecialChars) str = str.replace(/[^a-zA-Z0-9]/g, '');
    if (!options.caseSensitive) str = str.toLowerCase();
    return str;
};

const generateCompositeKey = (row: Record<string, any>, columns: string[], options: ComparisonOptions): string => {
  return columns.map((col) => prepareValue(row[col], options)).join('||');
};

const areRowsSimilar = (
    rowA: Record<string, any>,
    rowB: Record<string, any>,
    columns: string[],
    options: ComparisonOptions
): { isMatch: boolean; confidence: number } => {
    if (columns.length === 0) return { isMatch: false, confidence: 0 };

    let totalSimilarity = 0;

    for (const col of columns) {
        // For phonetic and fuzzy, we prepare values without case sensitivity to broaden matches
        const phoneticFuzzyOptions = {...options, caseSensitive: false };
        const valA = prepareValue(rowA[col], options.matchingMode === 'exact' ? options : phoneticFuzzyOptions);
        const valB = prepareValue(rowB[col], options.matchingMode === 'exact' ? options : phoneticFuzzyOptions);

        if (options.matchingMode === 'phonetic') {
            if (soundex(valA) !== soundex(valB)) {
                return { isMatch: false, confidence: 0 };
            }
        } else if (options.matchingMode === 'fuzzy') {
            const similarity = calculateSimilarity(valA, valB);
            if (similarity < options.fuzzyThreshold) {
                return { isMatch: false, confidence: 0 };
            }
            totalSimilarity += similarity;
        } else { // exact
            if (valA !== valB) {
                return { isMatch: false, confidence: 0 };
            }
        }
    }

    // If we get here, it's a match
    if (options.matchingMode === 'fuzzy') {
        const avgSimilarity = totalSimilarity / columns.length;
        return { isMatch: true, confidence: avgSimilarity };
    }
    
    return { isMatch: true, confidence: 1.0 };
};

const findSubgroupsByClustering = (
  rows: Record<string, any>[],
  columns: string[],
  options: ComparisonOptions
): { representative: Record<string, any>, members: {row: Record<string, any>, confidence: number}[] }[] => {
    const groups: { representative: Record<string, any>, members: {row: Record<string, any>, confidence: number}[] }[] = [];
    const assignedIndices = new Set<number>();

    for (let i = 0; i < rows.length; i++) {
        if (assignedIndices.has(i)) continue;

        const currentRow = rows[i];
        const newGroup = { representative: currentRow, members: [{row: currentRow, confidence: 1.0}] };
        assignedIndices.add(i);

        for (let j = i + 1; j < rows.length; j++) {
            if (assignedIndices.has(j)) continue;
            
            const compareRow = rows[j];
            const { isMatch, confidence } = areRowsSimilar(currentRow, compareRow, columns, options);

            if (isMatch) {
                newGroup.members.push({row: compareRow, confidence });
                assignedIndices.add(j);
            }
        }
        groups.push(newGroup);
    }
    return groups;
};

const groupRowsByPrimaryKey = (
    data: Record<string, any>[],
    primaryColumns: string[],
    options: ComparisonOptions
): Map<string, Record<string, any>[]> => {
    const primaryKeyOptions = { ...options, caseSensitive: true }; // Primary key is always exact
    const groups = new Map<string, Record<string, any>[]>();
    for (const row of data) {
        const key = generateCompositeKey(row, primaryColumns, primaryKeyOptions);
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(row);
    }
    return groups;
};


export const findDuplicatesInSingleFile = (
  file: ParsedFile,
  options: ComparisonOptions
): DuplicateResult => {
  const { primaryColumns, secondaryColumns } = options;
  if (primaryColumns.length === 0 && secondaryColumns.length === 0) {
    return { duplicates: [], cleanedData: file.data, totalDuplicates: 0, totalRowsProcessed: file.rowCount };
  }

  const duplicates: Record<string, any>[] = [];
  const cleanedData: Record<string, any>[] = [];

  // If only secondary columns are used, fall back to simple clustering on the whole file
  if (primaryColumns.length === 0) {
      const allSubgroups = findSubgroupsByClustering(file.data, secondaryColumns, options);
      allSubgroups.forEach(group => {
          cleanedData.push(group.members[0].row);
          if (group.members.length > 1) {
              duplicates.push(...group.members.slice(1).map(m => m.row));
          }
      });
  } else {
    // Hierarchical matching
    const primaryGroups = groupRowsByPrimaryKey(file.data, primaryColumns, options);
    
    for (const [key, rows] of primaryGroups.entries()) {
        if (rows.length === 1) {
            cleanedData.push(rows[0]);
            continue;
        }

        // If no secondary columns, all rows in a primary group (after the first) are duplicates
        if (secondaryColumns.length === 0) {
            cleanedData.push(rows[0]);
            duplicates.push(...rows.slice(1));
        } else {
            // Perform secondary clustering within the primary group
            const subgroups = findSubgroupsByClustering(rows, secondaryColumns, options);
            subgroups.forEach(group => {
                cleanedData.push(group.members[0].row);
                if (group.members.length > 1) {
                    duplicates.push(...group.members.slice(1).map(m => m.row));
                }
            });
        }
    }
  }

  return { duplicates, cleanedData, totalDuplicates: duplicates.length, totalRowsProcessed: file.rowCount };
};

const isRowPresentInFile = (
    rowToCheck: Record<string, any>,
    file: ParsedFile,
    options: ComparisonOptions
): boolean => {
    const { primaryColumns, secondaryColumns } = options;
    const primaryKeyOptions = { ...options, caseSensitive: true };

    const primaryKey = generateCompositeKey(rowToCheck, primaryColumns, primaryKeyOptions);

    // This is slow, but necessary for two-file comparison without pre-building a map
    const potentialMatches = file.data.filter(mainRow => 
        generateCompositeKey(mainRow, primaryColumns, primaryKeyOptions) === primaryKey
    );

    if (potentialMatches.length === 0) {
        return false;
    }

    if (secondaryColumns.length === 0) {
        return true; // Primary match is enough
    }

    // Check for secondary match within the potential matches
    for (const potentialMatch of potentialMatches) {
        const { isMatch } = areRowsSimilar(rowToCheck, potentialMatch, secondaryColumns, options);
        if (isMatch) {
            return true;
        }
    }

    return false;
};

export const findUniqueAndCommonRows = (
  mainFile: ParsedFile,
  comparisonFile: ParsedFile,
  options: ComparisonOptions
): DuplicateResult => {
  const { primaryColumns, secondaryColumns } = options;
  if (primaryColumns.length === 0 && secondaryColumns.length === 0) {
    return { duplicates: [], cleanedData: comparisonFile.data, totalDuplicates: 0, totalRowsProcessed: comparisonFile.rowCount };
  }

  const commonRows: Record<string, any>[] = [];
  const uniqueRows: Record<string, any>[] = [];

  // Pre-build a map of primary keys from the main file for performance
  const mainFilePrimaryGroups = groupRowsByPrimaryKey(mainFile.data, primaryColumns, options);
  
  for (const compRow of comparisonFile.data) {
    const primaryKey = generateCompositeKey(compRow, primaryColumns, { ...options, caseSensitive: true });
    const potentialMatches = mainFilePrimaryGroups.get(primaryKey);

    if (!potentialMatches) {
        uniqueRows.push(compRow);
        continue;
    }
    
    if (secondaryColumns.length === 0) {
        commonRows.push(compRow);
        continue;
    }

    let foundSecondaryMatch = false;
    for (const mainRow of potentialMatches) {
        const { isMatch } = areRowsSimilar(compRow, mainRow, secondaryColumns, options);
        if (isMatch) {
            foundSecondaryMatch = true;
            break;
        }
    }
    
    if (foundSecondaryMatch) {
        commonRows.push(compRow);
    } else {
        uniqueRows.push(compRow);
    }
  }

  return {
    duplicates: commonRows,
    cleanedData: uniqueRows,
    totalDuplicates: commonRows.length,
    totalRowsProcessed: comparisonFile.rowCount,
  };
};

export const generateDuplicateReport = (
  file: ParsedFile,
  options: ComparisonOptions
): DuplicateReportResult => {
    const { primaryColumns, secondaryColumns } = options;
    if (primaryColumns.length === 0 && secondaryColumns.length === 0) {
        return { reportData: [], totalDuplicateRows: 0, totalDuplicateGroups: 0, totalRowsProcessed: file.rowCount };
    }

    const reportData: Record<string, any>[] = [];
    let duplicateGroupId = 1;
    let totalDuplicateRows = 0;

    const processGroup = (rows: {row: Record<string, any>, confidence: number}[]) => {
         rows.forEach((member, index) => {
            const matchType = options.matchingMode.charAt(0).toUpperCase() + options.matchingMode.slice(1);
            reportData.push({
                'Duplicate Group ID': duplicateGroupId,
                'Is Original': index === 0 ? 'Yes' : 'No',
                'Match Type': secondaryColumns.length > 0 ? matchType : 'Exact (Primary)',
                'Confidence Score': secondaryColumns.length > 0 ? `${(member.confidence * 100).toFixed(0)}%` : '100%',
                ...member.row,
            });
        });
        totalDuplicateRows += rows.length;
        duplicateGroupId++;
    };


    if (primaryColumns.length === 0) {
        const allSubgroups = findSubgroupsByClustering(file.data, secondaryColumns, options);
        const duplicateSubgroups = allSubgroups.filter(g => g.members.length > 1);
        duplicateSubgroups.forEach(group => processGroup(group.members));
    } else {
        const primaryGroups = groupRowsByPrimaryKey(file.data, primaryColumns, options);
        for (const [key, rows] of primaryGroups.entries()) {
            if (rows.length > 1) {
                if (secondaryColumns.length === 0) {
                    processGroup(rows.map(r => ({ row: r, confidence: 1.0 })));
                } else {
                    const subgroups = findSubgroupsByClustering(rows, secondaryColumns, options);
                    const duplicateSubgroups = subgroups.filter(g => g.members.length > 1);
                    duplicateSubgroups.forEach(group => processGroup(group.members));
                }
            }
        }
    }
    
    return {
        reportData,
        totalDuplicateRows,
        totalDuplicateGroups: duplicateGroupId - 1,
        totalRowsProcessed: file.rowCount,
    };
};

export const performNWayComparison = (
    files: ParsedFile[],
    selectedColumns: string[],
    options: ComparisonOptions
): NWayComparisonResult => {
    if (files.length < 2 || selectedColumns.length === 0) {
        return { intersection: [], differences: [] };
    }

    // N-Way only uses primary columns for simplicity and performance
    const comparisonOptions = { ...options, primaryColumns: selectedColumns, secondaryColumns: [] };

    const fileKeySets = files.map(file => {
        const keyMap = new Map<string, Record<string, any>>();
        for (const row of file.data) {
            const key = generateCompositeKey(row, comparisonOptions.primaryColumns, comparisonOptions);
            if (!keyMap.has(key)) {
                keyMap.set(key, row);
            }
        }
        return keyMap;
    });

    // --- Find Intersection ---
    const intersectionKeys = new Set(fileKeySets[0].keys());
    for (let i = 1; i < fileKeySets.length; i++) {
        const currentKeys = fileKeySets[i].keys();
        for (const key of [...intersectionKeys]) {
            if (!fileKeySets[i].has(key)) {
                intersectionKeys.delete(key);
            }
        }
    }

    const intersection = Array.from(intersectionKeys).map(key => fileKeySets[0].get(key)!);

    // --- Find Differences ---
    const differences = files.map((file, i) => {
        const currentFileMap = fileKeySets[i];
        const otherFileKeySets = fileKeySets.filter((_, j) => i !== j);
        
        const uniqueData: Record<string, any>[] = [];
        for (const [key, row] of currentFileMap.entries()) {
            const isUnique = otherFileKeySets.every(otherSet => !otherSet.has(key));
            if (isUnique) {
                uniqueData.push(row);
            }
        }
        return { fileName: file.name, data: uniqueData };
    });

    return { intersection, differences };
};