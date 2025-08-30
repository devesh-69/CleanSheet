declare const levenshtein: {
    get: (a: string, b: string) => number;
};

/**
 * Calculates a normalized similarity score between two strings based on Levenshtein distance.
 * @returns A value between 0 (completely different) and 1 (identical).
 */
export const calculateSimilarity = (a: string, b: string): number => {
    if (a === b) return 1;
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 1;
    const distance = levenshtein.get(a, b);
    return 1 - distance / maxLength;
};


/**
 * Implements the Soundex algorithm to generate a phonetic code for a string.
 * @returns A 4-character string (e.g., 'R163').
 */
export const soundex = (s: string): string => {
    if (!s) {
        return "";
    }
    const a = s.toUpperCase().split('');
    const f = a.shift() || '';
    if (!f) return "";

    let r = f + a
        .map(v => {
            if ('BFPV'.includes(v)) return '1';
            if ('CGJKQSXZ'.includes(v)) return '2';
            if ('DT'.includes(v)) return '3';
            if (v === 'L') return '4';
            if ('MN'.includes(v)) return '5';
            if (v === 'R') return '6';
            return '';
        })
        .filter((v, i, a) => (i === 0) ? v !== getCode(f) : v !== a[i - 1])
        .join('');

    return (r + '000').substring(0, 4);
};

const getCode = (c: string): string => {
    if ('BFPV'.includes(c)) return '1';
    if ('CGJKQSXZ'.includes(c)) return '2';
    if ('DT'.includes(c)) return '3';
    if (c === 'L') return '4';
    if ('MN'.includes(c)) return '5';
    if (c === 'R') return '6';
    return '';
};
