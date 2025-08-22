import React, { useState } from 'react';
import { ParsedFile, AppStep, FindReplaceOptions, FindReplaceOperation } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { findAndReplace } from '../../services/dataCleaner';
import { SpinnerIcon, XCircleIcon } from '../ui/Icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

const OptionsSelector: React.FC<{
    file: ParsedFile,
    onProcess: (options: FindReplaceOptions) => void,
    onBack: () => void
}> = ({ file, onProcess, onBack }) => {
    const initialOptions: FindReplaceOptions = {
        selectedColumns: file.headers,
        operations: [{ id: Date.now(), find: '', replace: '' }],
        caseSensitive: false,
        matchEntireCell: false,
    };
    const [options, setOptions] = useState<FindReplaceOptions>(initialOptions);

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

    const addOperation = () => {
        setOptions(prev => ({ ...prev, operations: [...prev.operations, { id: Date.now(), find: '', replace: '' }] }));
    };

    const removeOperation = (id: number) => {
        setOptions(prev => ({ ...prev, operations: prev.operations.filter(op => op.id !== id) }));
    };

    const updateOperation = (id: number, field: 'find' | 'replace', value: string) => {
        setOptions(prev => ({
            ...prev,
            operations: prev.operations.map(op => op.id === id ? { ...op, [field]: value } : op)
        }));
    };

    const isProcessDisabled = options.selectedColumns.length === 0 || options.operations.every(op => !op.find);

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Configure Find & Replace</CardTitle>
                <CardDescription>Select columns and define one or more find/replace operations.</CardDescription>
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

                <div>
                    <h4 className="text-lg font-semibold mb-3">Operations</h4>
                    <div className="space-y-3">
                        {options.operations.map((op, index) => (
                            <div key={op.id} className="grid grid-cols-12 gap-2 items-center">
                                <input
                                    type="text"
                                    placeholder="Find what"
                                    value={op.find}
                                    onChange={(e) => updateOperation(op.id, 'find', e.target.value)}
                                    className="col-span-5 p-2 border rounded-md"
                                />
                                <input
                                    type="text"
                                    placeholder="Replace with"
                                    value={op.replace}
                                    onChange={(e) => updateOperation(op.id, 'replace', e.target.value)}
                                    className="col-span-6 p-2 border rounded-md"
                                />
                                <div className="col-span-1">
                                    {options.operations.length > 1 && (
                                        <button onClick={() => removeOperation(op.id)} className="text-gray-400 hover:text-red-600">
                                            <XCircleIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="secondary" onClick={addOperation} className="mt-4">Add Operation</Button>
                </div>
                
                 <div>
                    <h4 className="text-lg font-semibold mb-3">Matching Options</h4>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <label htmlFor="case-sensitive" className="text-sm text-gray-700">Case-sensitive matching</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="case-sensitive" className="sr-only peer" checked={options.caseSensitive} onChange={(e) => setOptions(o => ({...o, caseSensitive: e.target.checked}))} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <label htmlFor="match-entire-cell" className="text-sm text-gray-700">Match entire cell value</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="match-entire-cell" className="sr-only peer" checked={options.matchEntireCell} onChange={(e) => setOptions(o => ({...o, matchEntireCell: e.target.checked}))} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        </div>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess(options)} disabled={isProcessDisabled}>Process File</Button>
            </CardFooter>
        </Card>
    );
};

const FindReplaceTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [processedData, setProcessedData] = useState<Record<string, any>[] | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.SELECT_COLUMNS);
        }
    };

    const handleProcess = (options: FindReplaceOptions) => {
        if (file) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const cleanedData = findAndReplace(file.data, options);
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
                        id="find-replace-file"
                        title="Upload File"
                        description="Upload the spreadsheet you want to modify."
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
                        <h2 className="text-xl font-semibold text-gray-800">Applying Changes...</h2>
                        <p className="text-gray-500 mt-2">Please wait while we process your file.</p>
                    </div>
                );
            case AppStep.RESULTS:
                if (processedData && file) {
                    return <ResultsDisplay 
                        title="Your Modified File is Ready"
                        description={<>We've processed <span className="font-bold">{file.name}</span> and applied your find/replace rules. Preview the changes below.</>}
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
                <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white">Find & Replace (Bulk)</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Efficiently perform multiple find and replace operations across selected columns in your spreadsheet.
                </p>
            </header>
            {renderContent()}
        </div>
    );
};

export default FindReplaceTool;
