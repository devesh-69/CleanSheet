import React, { useState } from 'react';
import { ParsedFile, AppStep, ValidationOptions, ValidationResult, ValidationRule, ValidationRuleType } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { validateData } from '../../services/dataValidator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { XCircleIcon } from '../ui/Icons';

const RULE_DEFINITIONS: { type: ValidationRuleType, label: string, requiresInput: 'none' | 'minmax' | 'regex' }[] = [
    { type: 'is_not_empty', label: 'Is Not Empty', requiresInput: 'none' },
    { type: 'is_unique', label: 'Is Unique', requiresInput: 'none' },
    { type: 'is_number', label: 'Is a Number', requiresInput: 'none' },
    { type: 'is_integer', label: 'Is an Integer', requiresInput: 'none' },
    { type: 'is_email', label: 'Is a valid Email', requiresInput: 'none' },
    { type: 'is_url', label: 'Is a valid URL', requiresInput: 'none' },
    { type: 'text_length_between', label: 'Text Length Between', requiresInput: 'minmax' },
    { type: 'matches_regex', label: 'Matches Pattern (Regex)', requiresInput: 'regex' },
];

const OptionsSelector: React.FC<{
    file: ParsedFile,
    onProcess: (options: ValidationOptions) => void,
    onBack: () => void
}> = ({ file, onProcess, onBack }) => {
    const [rules, setRules] = useState<ValidationRule[]>([{ 
        id: Date.now(), 
        column: file.headers[0] || '', 
        type: 'is_not_empty',
        min: 0,
        max: 100,
        regex: ''
    }]);

    const addRule = () => {
        setRules(prev => [...prev, { 
            id: Date.now(), 
            column: file.headers[0] || '', 
            type: 'is_not_empty',
            min: 0,
            max: 100,
            regex: ''
        }]);
    };

    const removeRule = (id: number) => {
        setRules(prev => prev.filter(rule => rule.id !== id));
    };

    const updateRule = (id: number, field: keyof ValidationRule, value: any) => {
        setRules(prev => prev.map(rule => rule.id === id ? { ...rule, [field]: value } : rule));
    };

    const isProcessDisabled = rules.length === 0;

    return (
        <Card className="w-full max-w-4xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Configure Validation Rules</CardTitle>
                <CardDescription>Add one or more rules to check your data against.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {rules.map(rule => {
                        const definition = RULE_DEFINITIONS.find(d => d.type === rule.type);
                        return (
                        <div key={rule.id} className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-5">
                                    <label className="text-xs text-gray-400">Column</label>
                                    <select value={rule.column} onChange={e => updateRule(rule.id, 'column', e.target.value)} className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white">
                                        {file.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-6">
                                    <label className="text-xs text-gray-400">Rule</label>
                                    <select value={rule.type} onChange={e => updateRule(rule.id, 'type', e.target.value)} className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white">
                                        {RULE_DEFINITIONS.map(def => <option key={def.type} value={def.type}>{def.label}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-1 flex justify-end">
                                    {rules.length > 1 && (
                                        <button onClick={() => removeRule(rule.id)} className="text-gray-400 hover:text-red-400 p-2"><XCircleIcon className="w-5 h-5" /></button>
                                    )}
                                </div>
                            </div>
                            {definition?.requiresInput === 'minmax' && (
                                <div className="grid grid-cols-2 gap-3 pl-1">
                                    <div>
                                        <label className="text-xs text-gray-400">Min Length</label>
                                        <input type="number" value={rule.min} onChange={e => updateRule(rule.id, 'min', parseInt(e.target.value, 10))} className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Max Length</label>
                                        <input type="number" value={rule.max} onChange={e => updateRule(rule.id, 'max', parseInt(e.target.value, 10))} className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white" />
                                    </div>
                                </div>
                            )}
                            {definition?.requiresInput === 'regex' && (
                                 <div className="pl-1">
                                    <label className="text-xs text-gray-400">Regex Pattern</label>
                                    <input type="text" placeholder="e.g., ^[A-Z]{2}$" value={rule.regex} onChange={e => updateRule(rule.id, 'regex', e.target.value)} className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white font-mono" />
                                </div>
                            )}
                        </div>
                    )})}
                </div>
                <Button variant="secondary" onClick={addRule}>Add Rule</Button>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess({ rules })} disabled={isProcessDisabled}>Run Validation</Button>
            </CardFooter>
        </Card>
    );
};

const DataValidationTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [result, setResult] = useState<ValidationResult | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.SELECT_COLUMNS);
        }
    };

    const handleProcess = (options: ValidationOptions) => {
        if (file) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const validationResult = validateData(file, options);
                setResult(validationResult);
                setStep(AppStep.RESULTS);
            }, 500);
        }
    };
    
    const handleRestart = () => {
        setStep(AppStep.UPLOAD);
        setFile(null);
        setResult(null);
    };

    const renderContent = () => {
        switch (step) {
            case AppStep.UPLOAD:
                return (
                    <FileUploader
                        id="validation-file"
                        title="Upload File"
                        description="Upload the spreadsheet you want to validate."
                        onFileUpload={handleFileUpload}
                    />
                );
            case AppStep.SELECT_COLUMNS:
                if (file) {
                    return <OptionsSelector file={file} onProcess={handleProcess} onBack={handleRestart} />;
                }
                return null;
            case AppStep.PROCESSING:
                return <ProcessingIndicator title="Validating Data..." description="Please wait while we check your file against the rules." />;
            case AppStep.RESULTS:
                if (result && file) {
                    const reportHeaders = ['Original Row #', 'Error Column', 'Error Message', ...file.headers];
                    return <ResultsDisplay 
                        title="Validation Report"
                        description={<>Found <span className="font-bold text-red-400">{result.totalErrors} errors</span> across {result.invalidRows.length} rows in <span className="font-bold text-gray-200">{file.name}</span>.</>}
                        headers={reportHeaders}
                        tabs={[{ title: 'Invalid Rows', data: result.invalidRows, badgeType: 'danger' }]}
                        fileForExportName="validation_errors"
                        onRestart={handleRestart}
                    />;
                }
                return null;
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <ToolHeader
                title="Data Validation Checks"
                description="Define rules to check for data quality issues like missing values, incorrect formats, duplicates, and more."
            />
            {renderContent()}
        </div>
    );
};

export default DataValidationTool;