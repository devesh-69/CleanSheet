import React, { useState, useMemo } from 'react';
import { ParsedFile, AppStep, SummaryOptions, SummaryFunction } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { generateSummaryReport } from '../../services/dataCleaner';
import { SpinnerIcon } from '../ui/Icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

// A simple heuristic to find columns that likely contain numbers
const getNumericColumns = (file: ParsedFile): string[] => {
    if (file.data.length === 0) return [];
    const sampleSize = Math.min(10, file.data.length); // Check up to 10 rows
    const sampleRows = file.data.slice(0, sampleSize);

    return file.headers.filter(header => {
        return sampleRows.every(row => {
            const value = row[header];
            // Treat empty/null as potentially numeric (could be sparse data)
            if (value === null || value === '' || value === undefined) return true;
            // Check if it's a number or a string that can be parsed to a finite number
            return !isNaN(parseFloat(String(value))) && isFinite(Number(value));
        });
    });
};


const OptionsSelector: React.FC<{
    file: ParsedFile,
    onProcess: (options: SummaryOptions) => void,
    onBack: () => void
}> = ({ file, onProcess, onBack }) => {
    const numericColumns = useMemo(() => getNumericColumns(file), [file]);

    const [options, setOptions] = useState<SummaryOptions>({
        groupingColumn: file.headers[0] || '',
        aggregationColumn: numericColumns[0] || '',
        functions: ['count', 'sum'],
    });

    const handleFunctionToggle = (func: SummaryFunction) => {
        setOptions(prev => ({
            ...prev,
            functions: prev.functions.includes(func)
                ? prev.functions.filter(f => f !== func)
                : [...prev.functions, func]
        }));
    };

    const isProcessDisabled = !options.groupingColumn || !options.aggregationColumn || options.functions.length === 0;

    const allFunctions: SummaryFunction[] = ['count', 'sum', 'average', 'min', 'max'];
    
    return (
        <Card className="w-full max-w-3xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Configure Summary Report</CardTitle>
                <CardDescription>Select columns for grouping and calculation to generate your report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="grouping-col" className="block text-sm font-medium text-gray-300 mb-1">Group By (Rows)</label>
                        <select
                            id="grouping-col"
                            value={options.groupingColumn}
                            onChange={(e) => setOptions(o => ({...o, groupingColumn: e.target.value}))}
                            className="w-full p-2 border rounded-md bg-transparent border-white/20 text-white"
                        >
                            {file.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                         <p className="text-xs text-gray-400 mt-1">Select the column to create groups from.</p>
                    </div>
                     <div>
                        <label htmlFor="agg-col" className="block text-sm font-medium text-gray-300 mb-1">Calculate On (Values)</label>
                        <select
                            id="agg-col"
                            value={options.aggregationColumn}
                            onChange={(e) => setOptions(o => ({...o, aggregationColumn: e.target.value}))}
                            className="w-full p-2 border rounded-md bg-transparent border-white/20 text-white"
                        >
                             {numericColumns.length > 0 ? (
                                numericColumns.map(h => <option key={h} value={h}>{h}</option>)
                            ) : (
                                <option disabled>No numeric columns found</option>
                            )}
                        </select>
                         <p className="text-xs text-gray-400 mt-1">Select the numeric column for calculations.</p>
                    </div>
                </div>

                 <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">Calculations</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         {allFunctions.map(func => (
                            <div key={func} className="flex items-center p-3 bg-white/5 rounded-lg">
                                <input
                                    type="checkbox"
                                    id={`func-${func}`}
                                    checked={options.functions.includes(func)}
                                    onChange={() => handleFunctionToggle(func)}
                                    className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"
                                />
                                <label htmlFor={`func-${func}`} className="ml-3 block text-sm text-gray-300 capitalize">{func}</label>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess(options)} disabled={isProcessDisabled}>Generate Report</Button>
            </CardFooter>
        </Card>
    );
};

interface SummaryResult {
    summaryData: Record<string, any>[];
    summaryHeaders: string[];
}

const QuickSummaryTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [result, setResult] = useState<SummaryResult | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.SELECT_COLUMNS);
        }
    };

    const handleProcess = (options: SummaryOptions) => {
        if (file) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const reportResult = generateSummaryReport(file.data, options);
                setResult(reportResult);
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
                        id="summary-file"
                        title="Upload File"
                        description="Upload the spreadsheet you want to summarize."
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
                    <div className="flex flex-col items-center justify-center text-center p-8 glass-card rounded-lg animate-slide-in">
                        <SpinnerIcon className="w-12 h-12 text-blue-400 mb-4" />
                        <h2 className="text-xl font-semibold text-white">Generating Summary...</h2>
                        <p className="text-gray-400 mt-2">Please wait while we analyze your data.</p>
                    </div>
                );
            case AppStep.RESULTS:
                if (result && file) {
                    return <ResultsDisplay 
                        title="Summary Report"
                        description={<>Generated a summary from <span className="font-bold text-gray-200">{file.name}</span>. Preview the report below.</>}
                        headers={result.summaryHeaders}
                        tabs={[{ title: 'Summary Data', data: result.summaryData, badgeType: 'default' }]}
                        downloadableData={result.summaryData}
                        fileForExportName="summary_report"
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
            <header className="text-center animate-slide-in">
                <h1 className="text-5xl font-extrabold tracking-tight gradient-text">Quick Summary Report</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                    Generate a pivot-like summary from your data by grouping and calculating values from selected columns.
                </p>
            </header>
            {renderContent()}
        </div>
    );
};

export default QuickSummaryTool;