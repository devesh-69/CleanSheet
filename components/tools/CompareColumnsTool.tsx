
import React, { useState } from 'react';
import { ParsedFile, AppStep, ComparisonOptions, ColumnComparisonResult } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { compareColumns } from '../../services/dataCleaner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Toggle } from './ui/Toggle';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { FilePreview } from '../FilePreview';

const OptionsSelector: React.FC<{
    file: ParsedFile,
    onProcess: (columnA: string, columnB: string, options: ComparisonOptions) => void,
    onBack: () => void
}> = ({ file, onProcess, onBack }) => {
    const [columnA, setColumnA] = useState<string>(file.headers[0] || '');
    const [columnB, setColumnB] = useState<string>(file.headers[1] || '');
    // FIX: Initialize state with all required fields from ComparisonOptions type.
    const [options, setOptions] = useState<ComparisonOptions>({
        caseSensitive: false,
        trimWhitespace: true,
        ignoreSpecialChars: false,
        matchingMode: 'exact',
        fuzzyThreshold: 0.8,
        primaryColumns: [],
        secondaryColumns: [],
    });

    const handleProcess = () => {
        if(columnA && columnB) {
            onProcess(columnA, columnB, options);
        }
    }
    
    return (
        <Card className="w-full max-w-2xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Select Columns to Compare</CardTitle>
                <CardDescription>Choose the two columns you want to compare for differences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="column-a" className="block text-sm font-medium text-gray-300 mb-1">Column A</label>
                        <select
                            id="column-a"
                            value={columnA}
                            onChange={(e) => setColumnA(e.target.value)}
                            className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white"
                        >
                            {file.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="column-b" className="block text-sm font-medium text-gray-300 mb-1">Column B</label>
                        <select
                            id="column-b"
                            value={columnB}
                            onChange={(e) => setColumnB(e.target.value)}
                            className="w-full p-2 border rounded-md bg-slate-900 border-white/20 text-white"
                        >
                             {file.headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
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
                            <label htmlFor="ignore-special-chars-cols" className="text-sm text-gray-300">Ignore special characters (A-Z, 0-9)</label>
                            <Toggle id="ignore-special-chars-cols" checked={options.ignoreSpecialChars} onChange={(e) => setOptions(o => ({...o, ignoreSpecialChars: e.target.checked}))} />
                        </div>
                    </div>
                </div>
                {columnA === columnB && columnA !== '' && (
                    <p className="text-sm text-yellow-400 text-center">Warning: You have selected the same column twice.</p>
                )}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={handleProcess} disabled={!columnA || !columnB}>Find Mismatches</Button>
            </CardFooter>
        </Card>
    );
};

const CompareColumnsTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [result, setResult] = useState<ColumnComparisonResult | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.PREVIEW);
        }
    };

    const handleProcess = (columnA: string, columnB: string, options: ComparisonOptions) => {
        if (file) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const comparisonResult = compareColumns(file.data, columnA, columnB, options);
                setResult(comparisonResult);
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
                        id="compare-cols-file"
                        title="Upload File"
                        description="Upload the spreadsheet you want to analyze."
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
                return <ProcessingIndicator title="Comparing Columns..." description="Please wait while we check for differences." />;
            case AppStep.RESULTS:
                if (result && file) {
                    return <ResultsDisplay 
                        title="Comparison Complete"
                        description={<>Found <span className="font-bold text-red-400">{result.totalMismatches}</span> mismatched rows out of {result.totalRowsProcessed} checked.</>}
                        headers={file.headers}
                        tabs={[{ title: 'Mismatched Rows', data: result.mismatches, badgeType: 'danger' }]}
                        fileForExportName="column_mismatches"
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
                title="Compare Columns Within a File"
                description="Find rows where values in two different columns do not match."
            />
            {renderContent()}
        </div>
    );
};

export default CompareColumnsTool;
