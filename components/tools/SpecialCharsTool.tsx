import React, { useState } from 'react';
import { ParsedFile, AppStep, SpecialCharsOptions } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { removeSpecialChars } from '../../services/dataCleaner';
import { SpinnerIcon } from '../ui/Icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

const OptionsSelector: React.FC<{
    file: ParsedFile,
    onProcess: (options: SpecialCharsOptions) => void,
    onBack: () => void
}> = ({ file, onProcess, onBack }) => {
    const initialOptions: SpecialCharsOptions = {
        selectedColumns: file.headers,
        removePunctuation: true,
        removeMath: true,
        removeCurrency: true,
        removeEmoji: true,
        filterMode: 'none',
        customChars: '',
    };
    const [options, setOptions] = useState<SpecialCharsOptions>(initialOptions);
    const isFilterMode = options.filterMode !== 'none';

    const handleColumnToggle = (column: string) => {
        setOptions(prev => ({
            ...prev,
            selectedColumns: prev.selectedColumns.includes(column)
                ? prev.selectedColumns.filter(c => c !== column)
                : [...prev.selectedColumns, column]
        }));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOptions(prev => ({ ...prev, selectedColumns: e.target.checked ? file.headers : [] }));
    };
    
    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Configure Cleaning Options</CardTitle>
                <CardDescription>Select columns and choose which characters to remove.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="text-lg font-semibold mb-3">Columns to Process</h4>
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                        <div className="flex items-center border-b pb-2 mb-2">
                            <input type="checkbox" id="select-all-cols" checked={options.selectedColumns.length === file.headers.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                            <label htmlFor="select-all-cols" className="ml-3 block text-sm font-medium text-gray-900">Select All ({file.headers.length} columns)</label>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {file.headers.map(col => (
                                <div key={col} className="flex items-center">
                                    <input type="checkbox" id={`col-${col}`} checked={options.selectedColumns.includes(col)} onChange={() => handleColumnToggle(col)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/>
                                    <label htmlFor={`col-${col}`} className="ml-3 block text-sm text-gray-700 truncate" title={col}>{col}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h4 className="text-lg font-semibold">Remove Character Sets</h4>
                         <div className={`p-3 bg-gray-50 rounded-lg space-y-2 ${isFilterMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                             {(['removePunctuation', 'removeMath', 'removeCurrency', 'removeEmoji'] as (keyof SpecialCharsOptions)[]).map(opt => (
                                 <div key={opt} className="flex items-center">
                                     <input type="checkbox" id={opt} checked={!!options[opt]} onChange={(e) => setOptions(o => ({...o, [opt]: e.target.checked}))} disabled={isFilterMode} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                     <label htmlFor={opt} className="ml-3 text-sm text-gray-700 capitalize">{opt.replace('remove', '')}</label>
                                 </div>
                             ))}
                         </div>
                        <h4 className="text-lg font-semibold mt-4">Remove Custom Characters</h4>
                        <input type="text" placeholder="e.g., #@!%" value={options.customChars} onChange={e => setOptions(o => ({...o, customChars: e.target.value}))} disabled={isFilterMode} className={`w-full p-2 border rounded-md ${isFilterMode ? 'bg-gray-100' : ''}`} />
                    </div>
                     <div className="space-y-3">
                        <h4 className="text-lg font-semibold">Filtering Mode</h4>
                        <p className="text-sm text-gray-500">This will override other removal options and only keep the selected character types.</p>
                        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                            {(['none', 'alphanumeric', 'alphabetic', 'numeric'] as SpecialCharsOptions['filterMode'][]).map(mode => (
                                 <div key={mode} className="flex items-center">
                                     <input type="radio" id={`mode-${mode}`} name="filterMode" value={mode} checked={options.filterMode === mode} onChange={(e) => setOptions(o => ({...o, filterMode: e.target.value as SpecialCharsOptions['filterMode']}))} className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                     <label htmlFor={`mode-${mode}`} className="ml-3 text-sm text-gray-700 capitalize">{mode}</label>
                                 </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess(options)} disabled={options.selectedColumns.length === 0}>Process File</Button>
            </CardFooter>
        </Card>
    );
};

const SpecialCharsTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [processedData, setProcessedData] = useState<Record<string, any>[] | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.SELECT_COLUMNS);
        }
    };

    const handleProcess = (options: SpecialCharsOptions) => {
        if (file) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const cleanedData = removeSpecialChars(file.data, options);
                setProcessedData(cleanedData);
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
                        id="special-chars-file"
                        title="Upload File"
                        description="Upload the spreadsheet to clean special characters from."
                        onFileUpload={handleFileUpload}
                    />
                );
            case AppStep.SELECT_COLUMNS:
                if (file) {
                    return <OptionsSelector file={file} onProcess={handleProcess} onBack={handleRestart} />;
                }
                return null;
            case AppStep.PROCESSING:
                return (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg shadow-md">
                        <SpinnerIcon className="w-12 h-12 text-blue-600 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800">Cleaning Your File...</h2>
                        <p className="text-gray-500 mt-2">Please wait while we remove the special characters.</p>
                    </div>
                );
            case AppStep.RESULTS:
                if (processedData && file) {
                    return <ResultsDisplay 
                        title="Your Cleaned File is Ready"
                        description={<>We've processed <span className="font-bold">{file.name}</span> and applied your cleaning rules. You can preview the changes below and download the result.</>}
                        headers={file.headers}
                        tabs={[{ title: 'Processed Data', data: processedData, badgeType: 'success' }]}
                        downloadableData={processedData}
                        fileForExportName={file.name}
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
            <header className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white">Special Characters Remover</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Clean your spreadsheets by removing punctuation, symbols, emojis, and other unwanted characters from selected columns.
                </p>
            </header>
            {renderContent()}
        </div>
    );
};

export default SpecialCharsTool;
