
import React, { useState, useMemo } from 'react';
import { ParsedFile, AppStep, ComparisonOptions, NWayComparisonResult } from '../../types';
import { MultiFileUploader } from '../MultiFileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { performNWayComparison } from '../../services/duplicateDetector';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Toggle } from './ui/Toggle';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';

const OptionsSelector: React.FC<{
    files: ParsedFile[],
    onProcess: (selectedColumns: string[], options: ComparisonOptions) => void,
    onBack: () => void
}> = ({ files, onProcess, onBack }) => {
    
    const commonHeaders = useMemo(() => {
        if (files.length < 2) return [];
        const headerSets = files.map(f => new Set(f.headers));
        const firstSet = headerSets[0];
        return Array.from(firstSet).filter(header => headerSets.every(set => set.has(header)));
    }, [files]);

    const [selectedColumns, setSelectedColumns] = useState<string[]>(commonHeaders);
    // FIX: Add missing properties to satisfy ComparisonOptions type.
    const [options, setOptions] = useState<ComparisonOptions>({
        caseSensitive: false,
        trimWhitespace: true,
        ignoreSpecialChars: false,
        matchingMode: 'exact', // N-way only supports exact for performance
        fuzzyThreshold: 0.8,
        primaryColumns: [],
        secondaryColumns: [],
    });

    const handleColumnToggle = (column: string) => {
        setSelectedColumns(prev => prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedColumns(e.target.checked ? commonHeaders : []);
    };
    
    return (
        <Card className="w-full max-w-4xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Configure N-Way Comparison</CardTitle>
                <CardDescription>Select the columns to use for matching rows across all files. Only columns present in every file are shown.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">Shared Columns for Comparison</h4>
                    {commonHeaders.length > 0 ? (
                        <div className="border border-white/10 rounded-lg p-4 max-h-60 overflow-y-auto">
                            <div className="flex items-center border-b border-white/10 pb-2 mb-2">
                                <input type="checkbox" id="select-all" checked={selectedColumns.length === commonHeaders.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500" />
                                <label htmlFor="select-all" className="ml-3 block text-sm font-medium text-gray-300">Select All ({commonHeaders.length} columns)</label>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                                {commonHeaders.map(col => (
                                    <div key={col} className="flex items-center">
                                        <input type="checkbox" id={`col-${col}`} checked={selectedColumns.includes(col)} onChange={() => handleColumnToggle(col)} className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500" />
                                        <label htmlFor={`col-${col}`} className="ml-3 block text-sm text-gray-300 truncate" title={col}>{col}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-yellow-400 p-4 bg-yellow-500/10 rounded-lg">No common column headers found across all uploaded files. Please ensure the files you want to compare share at least one column with the exact same name.</p>
                    )}
                </div>
                 <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">Matching Options</h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <label htmlFor="trim-whitespace" className="text-sm text-gray-300">Ignore leading/trailing whitespace</label>
                            <Toggle id="trim-whitespace" checked={options.trimWhitespace} onChange={(e) => setOptions(o => ({...o, trimWhitespace: e.target.checked}))} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <label htmlFor="case-sensitive" className="text-sm text-gray-300">Case-sensitive matching</label>
                            <Toggle id="case-sensitive" checked={options.caseSensitive} onChange={(e) => setOptions(o => ({...o, caseSensitive: e.target.checked}))} />
                        </div>
                         <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <label htmlFor="ignore-special-chars" className="text-sm text-gray-300">Ignore special characters (A-Z, 0-9)</label>
                            <Toggle id="ignore-special-chars" checked={options.ignoreSpecialChars} onChange={(e) => setOptions(o => ({...o, ignoreSpecialChars: e.target.checked}))} />
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess(selectedColumns, options)} disabled={selectedColumns.length === 0}>Run Comparison</Button>
            </CardFooter>
        </Card>
    );
};

const NWayComparisonTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [files, setFiles] = useState<ParsedFile[]>([]);
    const [result, setResult] = useState<NWayComparisonResult | null>(null);

    const handleFilesChange = (uploadedFiles: ParsedFile[]) => {
        setFiles(uploadedFiles);
    };

    const handleProcess = (selectedColumns: string[], options: ComparisonOptions) => {
        if (files.length > 1) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const comparisonResult = performNWayComparison(files, selectedColumns, options);
                setResult(comparisonResult);
                setStep(AppStep.RESULTS);
            }, 500);
        }
    };
    
    const handleRestart = () => {
        setStep(AppStep.UPLOAD);
        setFiles([]);
        setResult(null);
    };

    const renderContent = () => {
        switch (step) {
            case AppStep.UPLOAD:
                return (
                    <div className="max-w-2xl mx-auto space-y-4 animate-slide-in">
                        <MultiFileUploader onFilesChange={handleFilesChange} description="Select or drop two or more files to compare."/>
                        <div className="flex justify-end">
                            <Button onClick={() => setStep(AppStep.SELECT_COLUMNS)} disabled={files.length < 2}>
                                Configure Comparison
                            </Button>
                        </div>
                    </div>
                );
            case AppStep.SELECT_COLUMNS:
                return <OptionsSelector files={files} onProcess={handleProcess} onBack={() => setStep(AppStep.UPLOAD)} />;
            case AppStep.PROCESSING:
                return <ProcessingIndicator title="Analyzing Files..." description="Comparing rows across all files to find intersections and differences." />;
            case AppStep.RESULTS:
                if (result) {
                    const allHeaders = Array.from(new Set(files.flatMap(f => f.headers)));
                    const tabs = [
                        { title: 'Intersection (Common Rows)', data: result.intersection, badgeType: 'default' as const },
                        ...result.differences.map(diff => ({
                            title: `Unique to ${diff.fileName}`,
                            data: diff.data,
                            badgeType: 'success' as const
                        }))
                    ];
                    return <ResultsDisplay 
                        title="Comparison Report"
                        description={<>Found <span className="font-bold text-gray-200">{result.intersection.length} rows common to all {files.length} files</span>. Unique rows for each file are in the tabs below.</>}
                        headers={allHeaders}
                        tabs={tabs}
                        fileForExportName="n-way-comparison"
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
                title="N-Way File Comparison"
                description="Compare multiple files to find common rows (intersection) and rows that are unique to each file (differences)."
            />
            {renderContent()}
        </div>
    );
};

export default NWayComparisonTool;
