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

const ModernToggle: React.FC<{ id: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, checked, onChange }) => (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id={id} className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-11 h-6 bg-gray-200/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r from-blue-500 to-purple-600"></div>
    </label>
);

const OptionsSelector: React.FC<{
    onProcess: (options: MergeOptions) => void,
    onBack: () => void,
    fileCount: number,
}> = ({ onProcess, onBack, fileCount }) => {
    const [options, setOptions] = useState<MergeOptions>({ addSourceColumn: true });
    return (
         <Card className="w-full max-w-lg mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Merge Options</CardTitle>
                <CardDescription>Configure how your files will be merged.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <label htmlFor="add-source-col" className="text-sm text-gray-300">Add a column with original file name</label>
                    <ModernToggle id="add-source-col" checked={options.addSourceColumn} onChange={(e) => setOptions(o => ({...o, addSourceColumn: e.target.checked}))} />
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
                    <div className="max-w-2xl mx-auto space-y-4 animate-slide-in">
                        <MultiFileUploader onFilesChange={handleFilesChange} description="Select or drop the spreadsheet files you want to merge."/>
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
                    <div className="flex flex-col items-center justify-center text-center p-8 glass-card rounded-lg animate-slide-in">
                        <SpinnerIcon className="w-12 h-12 text-blue-400 mb-4" />
                        <h2 className="text-xl font-semibold text-white">Merging Files...</h2>
                        <p className="text-gray-400 mt-2">Please wait while we combine your spreadsheets.</p>
                    </div>
                );
            case AppStep.RESULTS:
                if (result) {
                    return <ResultsDisplay 
                        title="Your Merged File is Ready"
                        description={<>We've successfully merged <span className="font-bold text-gray-200">{files.length}</span> files into a single dataset. You can preview the result below.</>}
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
            <header className="text-center animate-slide-in">
                <h1 className="text-5xl font-extrabold tracking-tight gradient-text">Merge Multiple Files</h1>
                <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                    Combine multiple CSV or Excel files into one. The tool will automatically create a unified set of columns.
                </p>
            </header>
            {renderContent()}
        </div>
    );
};

export default MergeFilesTool;