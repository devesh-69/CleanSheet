import React, { useState } from 'react';
import { ParsedFile, AppStep, ComparisonOptions, ColumnComparisonResult } from '../../types';
import { FileUploader } from '../FileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { compareColumns } from '../../services/dataCleaner';
import { SpinnerIcon } from '../ui/Icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

const ModernToggle: React.FC<{ id: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, checked, onChange }) => (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id={id} className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-11 h-6 bg-gray-200/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r from-blue-500 to-purple-600"></div>
    </label>
);

const OptionsSelector: React.FC<{
    file: ParsedFile,
    onProcess: (columnA: string, columnB: string, options: ComparisonOptions) => void,
    onBack: () => void
}> = ({ file, onProcess, onBack }) => {
    const [columnA, setColumnA] = useState<string>(file.headers[0] || '');
    const [columnB, setColumnB] = useState<string>(file.headers[1] || '');
    const [options, setOptions] = useState<ComparisonOptions>({
        caseSensitive: false,
        trimWhitespace: true,
        ignoreSpecialChars: false,
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
                            className="w-full p-2 border rounded-md bg-transparent border-white/20 text-white"
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
                            className="w-full p-2 border rounded-md bg-transparent border-white/20 text-white"
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
                            <ModernToggle id="trim-whitespace" checked={options.trimWhitespace} onChange={(e) => setOptions(o => ({...o, trimWhitespace: e.target.checked}))} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <label htmlFor="case-sensitive" className="text-sm text-gray-300">Case-sensitive matching</label>
                            <ModernToggle id="case-sensitive" checked={options.caseSensitive} onChange={(e) => setOptions(o => ({...o, caseSensitive: e.target.checked}))} />
                        </div>
                         <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <label htmlFor="ignore-special-chars-cols" className="text-sm text-gray-300">Ignore special characters (A-Z, 0-9)</label>
                            <ModernToggle id="ignore-special-chars-cols" checked={options.ignoreSpecialChars} onChange={(e) => setOptions(o => ({...o, ignoreSpecialChars: e.target.checked}))} />
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
            setStep(AppStep.SELECT_COLUMNS);
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
            case AppStep.SELECT_COLUMNS:
                if (file) {
                    return <OptionsSelector file={file} onProcess={handleProcess} onBack={handleRestart} />;
                }
                return null;
            case AppStep.PROCESSING:
                return (
                    <div className="flex flex-col items-center justify-center text-center p-8 glass-card rounded-lg animate-slide-in">
                        <SpinnerIcon className="w-12 h-12 text-blue-400 mb-4" />
                        <h2 className="text-xl font-semibold text-white">Comparing Columns...</h2>
                        <p className="text-gray-400 mt-2">Please wait while we check for differences.</p>
                    </div>
                );
            case AppStep.RESULTS:
                if (result && file) {
                    return <ResultsDisplay 
                        title="Comparison Complete"
                        description={<>Found <span className="font-bold text-red-400">{result.totalMismatches}</span> mismatched rows out of {result.totalRowsProcessed} checked.</>}
                        headers={file.headers}
                        tabs={[{ title: 'Mismatched Rows', data: result.mismatches, badgeType: 'danger' }]}
                        downloadableData={result.mismatches}
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
            <header className="text-center animate-slide-in">
                <h1 className="text-5xl font-extrabold tracking-tight gradient-text">Compare Columns Within a File</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                    Find rows where values in two different columns do not match.
                </p>
            </header>
            {renderContent()}
        </div>
    );
};

export default CompareColumnsTool;