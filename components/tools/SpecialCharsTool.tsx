import React, { useState } from 'react';
import { ParsedFile, AppStep, SpecialCharsOptions, DataQualityReport } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { removeSpecialChars } from '../../services/dataCleaner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { FilePreview } from '../FilePreview';
import { calculateDataQuality } from '../../services/qualityScorer';

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
        <Card className="w-full max-w-4xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Configure Cleaning Options</CardTitle>
                <CardDescription>Select columns and choose which characters to remove.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">Columns to Process</h4>
                    <div className="border border-white/10 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <div className="flex items-center border-b border-white/10 pb-2 mb-2">
                            <input type="checkbox" id="select-all-cols" checked={options.selectedColumns.length === file.headers.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"/>
                            <label htmlFor="select-all-cols" className="ml-3 block text-sm font-medium text-gray-300">Select All ({file.headers.length} columns)</label>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                            {file.headers.map(col => (
                                <div key={col} className="flex items-center">
                                    <input type="checkbox" id={`col-${col}`} checked={options.selectedColumns.includes(col)} onChange={() => handleColumnToggle(col)} className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"/>
                                    <label htmlFor={`col-${col}`} className="ml-3 block text-sm text-gray-300 truncate" title={col}>{col}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h4 className="text-lg font-semibold text-gray-200">Remove Character Sets</h4>
                         <div className={`p-3 bg-white/5 rounded-lg space-y-3 ${isFilterMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                             {(['removePunctuation', 'removeMath', 'removeCurrency', 'removeEmoji'] as (keyof SpecialCharsOptions)[]).map(opt => (
                                 <div key={opt} className="flex items-center">
                                     <input type="checkbox" id={opt} checked={!!options[opt]} onChange={(e) => setOptions(o => ({...o, [opt]: e.target.checked}))} disabled={isFilterMode} className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500" />
                                     <label htmlFor={opt} className="ml-3 text-sm text-gray-300 capitalize">{opt.replace('remove', '')}</label>
                                 </div>
                             ))}
                         </div>
                        <h4 className="text-lg font-semibold mt-4 text-gray-200">Remove Custom Characters</h4>
                        <input type="text" placeholder="e.g., #@!%" value={options.customChars} onChange={e => setOptions(o => ({...o, customChars: e.target.value}))} disabled={isFilterMode} className={`w-full p-2 border rounded-md bg-transparent border-white/20 focus:ring-blue-500 focus:border-blue-500 text-white ${isFilterMode ? 'opacity-50' : ''}`} />
                    </div>
                     <div className="space-y-3">
                        <h4 className="text-lg font-semibold text-gray-200">Filtering Mode</h4>
                        <p className="text-sm text-gray-400">This will override other removal options and only keep the selected character types.</p>
                        <div className="p-3 bg-white/5 rounded-lg space-y-3">
                            {(['none', 'alphanumeric', 'alphabetic', 'numeric'] as SpecialCharsOptions['filterMode'][]).map(mode => (
                                 <div key={mode} className="flex items-center">
                                     <input type="radio" id={`mode-${mode}`} name="filterMode" value={mode} checked={options.filterMode === mode} onChange={(e) => setOptions(o => ({...o, filterMode: e.target.value as SpecialCharsOptions['filterMode']}))} className="h-4 w-4 border-gray-500 text-blue-500 focus:ring-blue-500 bg-transparent" />
                                     <label htmlFor={`mode-${mode}`} className="ml-3 text-sm text-gray-300 capitalize">{mode}</label>
                                 </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess(options)} disabled={options.selectedColumns.length === 0}>Apply Rules & Preview</Button>
            </CardFooter>
        </Card>
    );
};

const SpecialCharsTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [dataHistory, setDataHistory] = useState<Record<string, any>[][]>([]);
    const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setDataHistory([uploadedFile.data]);
            setQualityReport(null);
            setStep(AppStep.PREVIEW);
        }
    };

    const handleProcess = (options: SpecialCharsOptions) => {
        const currentData = dataHistory[dataHistory.length - 1];
        if (file && currentData) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const beforeScore = calculateDataQuality(currentData);
                const cleanedData = removeSpecialChars(currentData, options);
                const afterScore = calculateDataQuality(cleanedData);
                
                setQualityReport({ before: beforeScore, after: afterScore });
                setDataHistory(prev => [...prev, cleanedData]);
                setStep(AppStep.RESULTS);
            }, 500);
        }
    };
    
    const handleRestart = () => {
        setStep(AppStep.UPLOAD);
        setFile(null);
        setDataHistory([]);
        setQualityReport(null);
    };

    const handleUndo = () => {
        setDataHistory(prev => prev.slice(0, -1));
        setQualityReport(null);
        setStep(AppStep.RESULTS);
    };

    const renderContent = () => {
        const processedData = dataHistory[dataHistory.length - 1];
        
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
            case AppStep.PREVIEW:
                if (file) {
                    return <FilePreview file={file} onConfirm={() => setStep(AppStep.SELECT_COLUMNS)} onBack={handleRestart} />;
                }
                return null;
            case AppStep.SELECT_COLUMNS:
                if (file) {
                    return <OptionsSelector file={file} onProcess={handleProcess} onBack={() => setStep(AppStep.RESULTS)} />;
                }
                return null;
            case AppStep.PROCESSING:
                return <ProcessingIndicator title="Cleaning Your File..." description="Please wait while we remove the special characters." />;
            case AppStep.RESULTS:
                if (processedData && file) {
                    return <ResultsDisplay 
                        title="Your Cleaned File is Ready"
                        description={
                            <>
                                We've processed <span className="font-bold text-gray-200">{file.name}</span>. You can apply more cleaning rules or download the result.
                                <Button variant="secondary" onClick={() => setStep(AppStep.SELECT_COLUMNS)} className="ml-4 h-8 px-4">Apply More Rules</Button>
                            </>
                        }
                        headers={file.headers}
                        tabs={[{ title: 'Processed Data', data: processedData, badgeType: 'success' }]}
                        fileForExportName={file.name}
                        qualityScore={qualityReport || undefined}
                        onRestart={handleRestart}
                        onUndo={handleUndo}
                        canUndo={dataHistory.length > 1}
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
                title="Special Characters Remover"
                description="Clean your spreadsheets by removing punctuation, symbols, emojis, and other unwanted characters from selected columns."
            />
            {renderContent()}
        </div>
    );
};

export default SpecialCharsTool;