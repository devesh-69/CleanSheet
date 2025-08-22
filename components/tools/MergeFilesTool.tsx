import React, { useState } from 'react';
import { ParsedFile, AppStep } from '../../types';
import { MultiFileUploader } from '../MultiFileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { mergeFiles } from '../../services/dataCleaner';
import { SpinnerIcon } from '../ui/Icons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

interface MergeOptions {
    addSourceColumn: boolean;
}

interface MergeResult {
    mergedData: Record<string, any>[];
    mergedHeaders: string[];
}

const OptionsSelector: React.FC<{
    onProcess: (options: MergeOptions) => void,
    onBack: () => void,
    fileCount: number,
}> = ({ onProcess, onBack, fileCount }) => {
    const [options, setOptions] = useState<MergeOptions>({ addSourceColumn: true });
    return (
         <Card className="w-full max-w-lg mx-auto">
            <CardHeader>
                <CardTitle>Merge Options</CardTitle>
                <CardDescription>Configure how your files will be merged.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <label htmlFor="add-source-col" className="text-sm text-gray-700">Add a column with original file name</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="add-source-col" className="sr-only peer" checked={options.addSourceColumn} onChange={(e) => setOptions(o => ({...o, addSourceColumn: e.target.checked}))} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </CardContent>
             <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back</Button>
                <Button onClick={() => onProcess(options)}>Merge {fileCount} Files</Button>
            </CardFooter>
        </Card>
    );
}

const MergeFilesTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [files, setFiles] = useState<ParsedFile[]>([]);
    const [result, setResult] = useState<MergeResult | null>(null);

    const handleFilesChange = (uploadedFiles: ParsedFile[]) => {
        setFiles(uploadedFiles);
    };

    const handleProcess = (options: MergeOptions) => {
        if (files.length > 1) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const mergeResult = mergeFiles(files, options);
                setResult(mergeResult);
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
                    <div className="max-w-2xl mx-auto space-y-4">
                        <MultiFileUploader onFilesChange={handleFilesChange} />
                        <div className="flex justify-end">
                            <Button onClick={() => setStep(AppStep.SELECT_COLUMNS)} disabled={files.length < 2}>
                                Proceed to Merge
                            </Button>
                        </div>
                    </div>
                );
            case AppStep.SELECT_COLUMNS:
                return <OptionsSelector onProcess={handleProcess} onBack={() => setStep(AppStep.UPLOAD)} fileCount={files.length} />;
            case AppStep.PROCESSING:
                return (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg shadow-md">
                        <SpinnerIcon className="w-12 h-12 text-blue-600 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800">Merging Files...</h2>
                        <p className="text-gray-500 mt-2">Please wait while we combine your spreadsheets.</p>
                    </div>
                );
            case AppStep.RESULTS:
                if (result) {
                    return <ResultsDisplay 
                        title="Your Merged File is Ready"
                        description={<>We've successfully merged <span className="font-bold">{files.length}</span> files into a single dataset. You can preview the result below.</>}
                        headers={result.mergedHeaders}
                        tabs={[{ title: 'Merged Data', data: result.mergedData, badgeType: 'success' }]}
                        downloadableData={result.mergedData}
                        fileForExportName="merged_files"
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
                <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white">Merge Multiple Files</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Combine multiple CSV or Excel files into one. The tool will automatically create a unified set of columns.
                </p>
            </header>
            {renderContent()}
        </div>
    );
};

export default MergeFilesTool;
