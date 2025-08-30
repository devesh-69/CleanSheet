import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ParsedFile, AppStep, NormalizationOptions, NormalizationRule, NormalizationFormat } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { normalizeData } from '../../services/dataCleaner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { XCircleIcon } from './ui/Icons';
import { FilePreview } from '../FilePreview';

const RULE_DEFINITIONS: { format: NormalizationFormat, label: string }[] = [
    { format: 'phone_us', label: 'Phone Number (US)' },
    { format: 'date_iso', label: 'Date (YYYY-MM-DD)' },
    { format: 'date_us', label: 'Date (MM/DD/YYYY)' },
    { format: 'text_cleanup', label: 'Basic Text Cleanup (Trim spaces)' },
];

const MultiColumnSelector: React.FC<{
    allColumns: string[];
    selectedColumns: string[];
    onSelectionChange: (selected: string[]) => void;
}> = ({ allColumns, selectedColumns, onSelectionChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredColumns = useMemo(() => 
        allColumns.filter(col => col.toLowerCase().includes(searchTerm.toLowerCase())),
        [allColumns, searchTerm]
    );

    const handleToggle = (column: string) => {
        const newSelection = selectedColumns.includes(column)
            ? selectedColumns.filter(c => c !== column)
            : [...selectedColumns, column];
        onSelectionChange(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSelectionChange(e.target.checked ? allColumns : []);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white text-left flex justify-between items-center"
            >
                <span className="truncate">
                    {selectedColumns.length === 0 ? 'Select columns...' : `${selectedColumns.length} column(s) selected`}
                </span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-white/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 sticky top-0 bg-slate-800">
                        <input
                            type="text"
                            placeholder="Search columns..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-2 py-1 border rounded-md bg-slate-900 border-white/20 text-white"
                        />
                    </div>
                    <div className="flex items-center px-3 py-2 border-b border-white/10">
                        <input type="checkbox" id="select-all" checked={allColumns.length > 0 && selectedColumns.length === allColumns.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"/>
                        <label htmlFor="select-all" className="ml-3 block text-sm font-medium text-gray-300">Select All</label>
                    </div>
                    <div className="p-2">
                        {filteredColumns.map(col => (
                            <div key={col} className="flex items-center p-1 rounded-md hover:bg-white/10">
                                <input type="checkbox" id={`col-${col}`} checked={selectedColumns.includes(col)} onChange={() => handleToggle(col)} className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"/>
                                <label htmlFor={`col-${col}`} className="ml-3 block text-sm text-gray-300 truncate" title={col}>{col}</label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const OptionsSelector: React.FC<{
    file: ParsedFile,
    onProcess: (options: NormalizationOptions) => void,
    onBack: () => void
}> = ({ file, onProcess, onBack }) => {
    const [rules, setRules] = useState<NormalizationRule[]>([{ 
        id: Date.now(), 
        selectedColumns: file.headers.length > 0 ? [file.headers[0]] : [], 
        format: 'phone_us'
    }]);

    const addRule = () => {
        setRules(prev => [...prev, { 
            id: Date.now(), 
            selectedColumns: [], 
            format: 'phone_us'
        }]);
    };

    const removeRule = (id: number) => {
        setRules(prev => prev.filter(rule => rule.id !== id));
    };

    const updateRule = (id: number, field: keyof NormalizationRule, value: any) => {
        setRules(prev => prev.map(rule => rule.id === id ? { ...rule, [field]: value } : rule));
    };

    const isProcessDisabled = rules.length === 0 || rules.some(r => r.selectedColumns.length === 0);

    return (
        <Card className="w-full max-w-4xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Configure Normalization Rules</CardTitle>
                <CardDescription>Add one or more rules to standardize formats in your data. Each rule can apply to multiple columns.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                    {rules.map(rule => (
                        <div key={rule.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-6">
                                    <label className="text-xs text-gray-400 mb-1 block">Columns</label>
                                    <MultiColumnSelector
                                        allColumns={file.headers}
                                        selectedColumns={rule.selectedColumns}
                                        onSelectionChange={(newSelection) => updateRule(rule.id, 'selectedColumns', newSelection)}
                                    />
                                </div>
                                <div className="md:col-span-5">
                                    <label className="text-xs text-gray-400 mb-1 block">Standardize To</label>
                                    <select value={rule.format} onChange={e => updateRule(rule.id, 'format', e.target.value)} className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white">
                                        {RULE_DEFINITIONS.map(def => <option key={def.format} value={def.format}>{def.label}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-1 flex justify-end">
                                    {rules.length > 1 && (
                                        <button onClick={() => removeRule(rule.id)} className="text-gray-400 hover:text-red-400 p-2"><XCircleIcon className="w-5 h-5" /></button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <Button variant="secondary" onClick={addRule}>Add Rule</Button>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess({ rules })} disabled={isProcessDisabled}>Apply Rules</Button>
            </CardFooter>
        </Card>
    );
};

const SmartNormalizationTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [processedData, setProcessedData] = useState<Record<string, any>[] | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.PREVIEW);
        }
    };

    const handleProcess = (options: NormalizationOptions) => {
        if (file) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const normalized = normalizeData(file.data, options);
                setProcessedData(normalized);
                setStep(AppStep.RESULTS);
            }, 500);
        }
    };
    
    const handleRestart = () => {
        setStep(AppStep.UPLOAD);
        setFile(null);
        setProcessedData(null);
    };

    const renderContent = () => {
        switch (step) {
            case AppStep.UPLOAD:
                return (
                    <FileUploader
                        id="normalization-file"
                        title="Upload File"
                        description="Upload the spreadsheet with data you want to standardize."
                        onFileUpload={handleFileUpload}
                    />
                );
            case AppStep.PREVIEW:
                if (file) {
                    return <FilePreview file={file} onConfirm={() => setStep(AppStep.SELECT_COLUMNS)} onBack={handleRestart} />;
                }
                return null;
            case AppStep.SELECT_COLUMNS:
                if (file) {
                    return <OptionsSelector file={file} onProcess={handleProcess} onBack={() => setStep(AppStep.PREVIEW)} />;
                }
                return null;
            case AppStep.PROCESSING:
                return <ProcessingIndicator title="Normalizing Data..." description="Please wait while we apply your standardization rules." />;
            case AppStep.RESULTS:
                if (processedData && file) {
                    return <ResultsDisplay 
                        title="Normalization Complete"
                        description={<>We've standardized the data in <span className="font-bold text-gray-200">{file.name}</span>. Preview the changes below.</>}
                        headers={file.headers}
                        tabs={[{ title: 'Normalized Data', data: processedData, badgeType: 'success' }]}
                        fileForExportName="normalized_data"
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
                title="Smart Normalization"
                description="Clean your data by standardizing common formats like phone numbers, dates, and addresses using predefined patterns."
            />
            {renderContent()}
        </div>
    );
};

export default SmartNormalizationTool;