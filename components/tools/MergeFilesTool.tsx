import React, { useState } from 'react';
import { ParsedFile, AppStep } from '../../types';
import { MultiFileUploader } from '../MultiFileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { mergeFiles } from '../../services/dataCleaner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { Toggle } from '../ui/Toggle';

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
         <Card className="w-full max-w-lg mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Merge Options</CardTitle>
                <CardDescription>Configure how your files will be merged.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <label htmlFor="add-source-col" className="text-sm text-gray-300">Add a column with original file name</label>
                    <Toggle id="add-source-col" checked={options.addSourceColumn} onChange={(e) => setOptions(o => ({...o, addSourceColumn: e.target.checked}))} />
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
                return <ProcessingIndicator title="Merging Files..." description="Please wait while we combine your spreadsheets." />;
            case AppStep.RESULTS:
                if (result) {
                    return <ResultsDisplay 
                        title="Your Merged File is Ready"
                        description={<>We've successfully merged <span className="font-bold text-gray-200">{files.length}</span> files into a single dataset. You can preview the result below.</>}
                        headers={result.mergedHeaders}
                        tabs={[{ title: 'Merged Data', data: result.mergedData, badgeType: 'success' }]}
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
            <ToolHeader
                title="Merge Multiple Files"
                description="Combine multiple CSV or Excel files into one. The tool will automatically create a unified set of columns."
            />
            {renderContent()}
        </div>
    );
};

export default MergeFilesTool;
