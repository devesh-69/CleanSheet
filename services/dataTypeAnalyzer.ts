import { DataType } from '../types';

const SAMPLE_SIZE = 100;
const CONFIDENCE_THRESHOLD = 0.9; // 90% of non-empty samples must match

const REGEX = {
    // Stricter integer check: no decimals, allows negative
    integer: /^-?\d+$/,
    // Stricter number check: allows decimals and negatives
    number: /^-?\d+(\.\d+)?$/,
    // Basic email format
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    // Simple URL check
    url: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
    // ISO 8601 Date format (YYYY-MM-DD)
    isoDate: /^\d{4}-\d{2}-\d{2}/,
    // Common US Date format (MM/DD/YYYY)
    usDate: /^\d{1,2}\/\d{1,2}\/\d{4}/,
     // Common EU Date format (DD-MM-YYYY)
    euDate: /^\d{1,2}-\d{1,2}-\d{4}/,
};

const isBoolean = (value: string): boolean => {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no' || lower === '1' || lower === '0';
};

const isDate = (value: string): boolean => {
    if (REGEX.isoDate.test(value) || REGEX.usDate.test(value) || REGEX.euDate.test(value)) {
        // Regex passed, now try to parse it to see if it's a valid date
        const parsed = Date.parse(value);
        return !isNaN(parsed);
    }
    return false;
}

const TYPE_CHECKS: { type: DataType, test: (value: string) => boolean }[] = [
    { type: DataType.Integer, test: (v) => REGEX.integer.test(v) },
    { type: DataType.Number, test: (v) => REGEX.number.test(v) },
    { type: DataType.Boolean, test: (v) => isBoolean(v) },
    { type: DataType.Date, test: (v) => isDate(v) },
    { type: DataType.Email, test: (v) => REGEX.email.test(v) },
    { type: DataType.URL, test: (v) => REGEX.url.test(v) },
];


export const analyzeColumnTypes = (
    data: Record<string, any>[],
    headers: string[]
): Record<string, DataType> => {
    const columnTypes: Record<string, DataType> = {};

    for (const header of headers) {
        const samples: string[] = [];
        let i = 0;
        while (samples.length < SAMPLE_SIZE && i < data.length) {
            const value = data[i][header];
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                samples.push(String(value).trim());
            }
            i++;
        }
        
        if (samples.length === 0) {
            columnTypes[header] = DataType.String; // Default for empty columns
            continue;
        }

        let bestType = DataType.String;

        for (const checker of TYPE_CHECKS) {
            const matchCount = samples.reduce((acc, sample) => acc + (checker.test(sample) ? 1 : 0), 0);
            if ((matchCount / samples.length) >= CONFIDENCE_THRESHOLD) {
                bestType = checker.type;
                break; // Found a confident match, no need to check further
            }
        }
        
        columnTypes[header] = bestType;
    }

    return columnTypes;
};
