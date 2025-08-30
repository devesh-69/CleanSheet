import { ValidationOptions, ValidationResult, ValidationRule, ParsedFile } from '../types';

const RULE_MESSAGES: Record<string, (rule: ValidationRule, value?: any) => string> = {
    is_not_empty: () => 'Cell is empty',
    is_unique: () => 'Value is not unique in this column',
    is_number: () => 'Not a valid number',
    is_integer: () => 'Not a valid integer',
    is_email: () => 'Invalid email format',
    is_url: () => 'Invalid URL format',
    text_length_between: (rule, value) => `Text length (${String(value).length}) is outside the range of ${rule.min}-${rule.max}`,
    matches_regex: (rule) => `Does not match the required pattern: ${rule.regex}`,
};

const VALIDATORS: Record<string, (value: any, rule: ValidationRule, context: { uniqueSet: Set<any> }) => boolean> = {
    is_not_empty: (value) => value !== null && value !== undefined && String(value).trim() !== '',
    is_unique: (value, rule, context) => {
        if (context.uniqueSet.has(value)) {
            return false;
        }
        context.uniqueSet.add(value);
        return true;
    },
    is_number: (value) => !isNaN(parseFloat(String(value))) && isFinite(Number(value)),
    is_integer: (value) => Number.isInteger(Number(value)) && String(value).trim().match(/^-?\d+$/) !== null,
    is_email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
    is_url: (value) => {
        try {
            new URL(String(value));
            return true;
        } catch (_) {
            return false;
        }
    },
    text_length_between: (value, rule) => {
        const len = String(value).length;
        const min = rule.min ?? 0;
        const max = rule.max ?? Infinity;
        return len >= min && len <= max;
    },
    matches_regex: (value, rule) => {
        try {
            return new RegExp(rule.regex || '').test(String(value));
        } catch (e) {
            return false; // Invalid regex pattern
        }
    },
};


export const validateData = (
    file: ParsedFile,
    options: ValidationOptions
): ValidationResult => {
    const invalidRows: Record<string, any>[] = [];
    let totalErrors = 0;

    const rulesByColumn = options.rules.reduce((acc, rule) => {
        if (!acc[rule.column]) {
            acc[rule.column] = [];
        }
        acc[rule.column].push(rule);
        return acc;
    }, {} as Record<string, ValidationRule[]>);
    
    // Pre-calculate unique sets for uniqueness checks
    const uniqueContexts: Record<string, { uniqueSet: Set<any> }> = {};
    for (const rule of options.rules) {
        if (rule.type === 'is_unique') {
            const tempSet = new Set<any>();
            const seen = new Set<any>();
            for(const row of file.data) {
                const value = row[rule.column];
                if(seen.has(value)) {
                    tempSet.add(value);
                } else {
                    seen.add(value);
                }
            }
            uniqueContexts[rule.column] = { uniqueSet: tempSet };
        }
    }

    const simpleUniqueValidator = (value: any, context: { uniqueSet: Set<any> }) => {
        return !context.uniqueSet.has(value);
    }
    
    file.data.forEach((row, rowIndex) => {
        let rowHasError = false;
        const errorsForThisRow: { column: string; message: string }[] = [];

        for (const column in rulesByColumn) {
            const cellValue = row[column];
            for (const rule of rulesByColumn[column]) {
                let isValid = true;
                if (rule.type === 'is_unique') {
                     isValid = simpleUniqueValidator(cellValue, uniqueContexts[column]);
                } else if (VALIDATORS[rule.type]) {
                    // Skip validation for empty cells unless the rule is specifically 'is_not_empty'
                    if (rule.type !== 'is_not_empty' && !VALIDATORS.is_not_empty(cellValue, rule, {} as any)) {
                        continue;
                    }
                    isValid = VALIDATORS[rule.type](cellValue, rule, {} as any);
                }
                
                if (!isValid) {
                    rowHasError = true;
                    const message = RULE_MESSAGES[rule.type](rule, cellValue);
                    errorsForThisRow.push({ column, message });
                    totalErrors++;
                }
            }
        }
        
        if (rowHasError) {
             invalidRows.push({
                'Original Row #': rowIndex + 1,
                'Error Column': errorsForThisRow.map(e => e.column).join(', '),
                'Error Message': errorsForThisRow.map(e => e.message).join('; '),
                ...row,
            });
        }
    });

    return {
        invalidRows,
        totalErrors,
        totalRowsProcessed: file.data.length,
    };
};
