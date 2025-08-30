import React, { useState, useMemo } from 'react';
import { ParsedFile, AppStep, SummaryOptions, SummaryFunction, Aggregation } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { generateSummaryReport } from '../../services/dataCleaner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { XCircleIcon } from '../ui/Icons';

// A more robust heuristic to find columns that likely contain numbers
const getNumericColumns = (file: ParsedFile): string[] => {
    if (file.data.length === 0) return [];
    // Use a larger sample for more accuracy
    const sampleSize = Math.min(50, file.data.length); 
    const sampleRows = file.data.slice(0, sampleSize);
    if (sampleSize === 0) return [];

    return file.headers.filter(header => {
        let numericCount = 0;
        let nonNullCount = 0;
        for (const row of sampleRows) {
            const value = row[header];
            if (value !== null && value !== '' && value !== undefined) {
                nonNullCount++;
                if (!isNaN(parseFloat(String(value))) && isFinite(Number(value))) {
                    numericCount++;
                }
            }
        }
        // If the column has very few non-null values in the sample, don't classify it.
        if (nonNullCount < Math.min(5, sampleSize * 0.1)) return false;
        // Classify as numeric if > 80% of non-null values are numbers
        return (numericCount / nonNullCount) > 0.8;
    });
};


const OptionsSelector: React.FC<{
    file: ParsedFile,
    onProcess: (options: SummaryOptions) => void,
    onBack: () => void
}> = ({ file, onProcess, onBack }) => {
    const numericColumns = useMemo(() => getNumericColumns(file), [file]);
    const allColumns = file.headers;
    const allFunctions: { id: SummaryFunction, label: string }[] = [
        { id: 'count', label: 'Count' },
        { id: 'count_unique', label: 'Count Unique' },
        { id: 'sum', label: 'Sum' },
        { id: 'average', label: 'Average' },
        { id: 'min', label: 'Min' },
        { id: 'max', label: 'Max' },
    ];
    
    // Initial state setup
    const [groupingColumns, setGroupingColumns] = useState<string[]>([allColumns[0] || '']);
    const [aggregations, setAggregations] = useState<Aggregation[]>([
        { id: Date.now(), column: numericColumns[0] || allColumns[1] || allColumns[0], function: 'sum' }
    ]);

    const handleGroupingToggle = (column: string) => {
        setGroupingColumns(prev => 
            prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
        );
    };

    const addAggregation = () => {
        setAggregations(prev => [...prev, {
            id: Date.now(),
            column: numericColumns[0] || allColumns[0],
            function: 'sum'
        }]);
    };

    const removeAggregation = (id: number) => {
        setAggregations(prev => prev.filter(agg => agg.id !== id));
    };

    const updateAggregation = (id: number, field: 'column' | 'function', value: string) => {
        setAggregations(prev => prev.map(agg => 
            agg.id === id ? { ...agg, [field]: value } : agg
        ));
    };

    const isProcessDisabled = groupingColumns.length === 0 || aggregations.length === 0;

    return (
        <Card className="w-full max-w-4xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Configure Summary Report</CardTitle>
                <CardDescription>Select columns for grouping and add calculations to generate your report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">Group By (Rows)</h4>
                    <div className="border border-white/10 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {allColumns.map(col => (
                                <div key={col} className="flex items-center">
                                    <input type="checkbox" id={`group-${col}`} checked={groupingColumns.includes(col)} onChange={() => handleGroupingToggle(col)} className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-slate-900 focus:ring-blue-500" />
                                    <label htmlFor={`group-${col}`} className="ml-3 block text-sm text-gray-300 truncate" title={col}>{col}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">Summarize Values</h4>
                    <div className="space-y-3">
                        {aggregations.map((agg) => {
                            const isNumeric = numericColumns.includes(agg.column);
                            return (
                                <div key={agg.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-white/5 rounded-lg">
                                    <div className="col-span-12 md:col-span-5">
                                        <label className="text-xs text-gray-400">Column</label>
                                        <select value={agg.column} onChange={e => updateAggregation(agg.id, 'column', e.target.value)} className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white">
                                            {allColumns.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-10 md:col-span-6">
                                        <label className="text-xs text-gray-400">Calculation</label>
                                        <select value={agg.function} onChange={e => updateAggregation(agg.id, 'function', e.target.value)} className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white">
                                            {allFunctions.map(f => (
                                                <option key={f.id} value={f.id} disabled={!isNumeric && f.id !== 'count' && f.id !== 'count_unique'}>
                                                    {f.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 flex justify-end items-end h-full">
                                        {aggregations.length > 1 && (
                                            <button onClick={() => removeAggregation(agg.id)} className="text-gray-400 hover:text-red-400 p-2">
                                                <XCircleIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <Button variant="secondary" onClick={addAggregation} className="mt-4">Add Calculation</Button>
                </div>

            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess({ groupingColumns, aggregations })} disabled={isProcessDisabled}>Generate Report</Button>
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
                return <ProcessingIndicator title="Generating Summary..." description="Please wait while we analyze your data." />;
            case AppStep.RESULTS:
                if (result && file) {
                    return <ResultsDisplay 
                        title="Summary Report"
                        description={<>Generated a summary from <span className="font-bold text-gray-200">{file.name}</span>. Preview the report below.</>}
                        headers={result.summaryHeaders}
                        tabs={[{ title: 'Summary Data', data: result.summaryData, badgeType: 'default' }]}
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
            <ToolHeader
                title="Quick Summary Report"
                description="Generate a pivot-like summary from your data by grouping and calculating values from selected columns."
            />
            {renderContent()}
        </div>
    );
};

export default QuickSummaryTool;