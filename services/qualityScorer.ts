import { DataQualityReport } from '../types';

/**
 * Calculates a data quality score for a dataset based on completeness and cleanliness.
 * @param data - The array of data records to analyze.
 * @returns A score between 0 and 100.
 */
export const calculateDataQuality = (data: Record<string, any>[]): number => {
    if (data.length === 0) return 100;

    let totalCells = 0;
    let nonEmptyCells = 0;
    let totalStringCells = 0;
    let cleanStringCells = 0;

    const headers = Object.keys(data[0] || {});
    totalCells = data.length * headers.length;

    for (const row of data) {
        for (const header of headers) {
            const value = row[header];

            // Completeness check
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                nonEmptyCells++;
            }

            // Cleanliness check
            if (typeof value === 'string') {
                totalStringCells++;
                if (value === value.trim()) {
                    cleanStringCells++;
                }
            }
        }
    }

    const completenessScore = totalCells > 0 ? (nonEmptyCells / totalCells) : 1;
    // If there are no strings, cleanliness is perfect.
    const cleanlinessScore = totalStringCells > 0 ? (cleanStringCells / totalStringCells) : 1;

    // Weighted average: Completeness is more important.
    const finalScore = (completenessScore * 0.7 + cleanlinessScore * 0.3) * 100;

    return Math.round(finalScore);
};