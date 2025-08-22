import React, { useState } from 'react';
import { ParsedFile, ComparisonOptions, DuplicateResult, AppStep } from '../../types';
import { FileUploader } from '../FileUploader';
import { ColumnSelector } from '../ColumnSelector';
import { ResultsDisplay } from '../ResultsDisplay';
import { findDuplicatesInSingleFile } from '../../services/duplicateDetector';
import { SpinnerIcon } from '../ui/Icons';

const SingleFileDuplicateRemover: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [results, setResults] = useState<DuplicateResult | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.SELECT_COLUMNS);
        }
    };

    const handleProcess = (selectedColumns: string[], options: ComparisonOptions) => {
        if (file) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const duplicateResults = findDuplicatesInSingleFile(file, selectedColumns, options);
                setResults(duplicateResults);
                setStep(AppStep.RESULTS);
            }, 500);
        }
    };

    const handleRestart = () => {
        setStep(AppStep.UPLOAD);
        setFile(null);
        setResults(null);
    };

    const renderContent = () => {
        switch (step) {
            case AppStep.UPLOAD:
                return (
                    <FileUploader
                        id="single-file"
                        title="Upload File"
                        description="Upload the spreadsheet you want to clean."
                        onFileUpload={handleFileUpload}
                    />
                );
            case AppStep.SELECT_COLUMNS:
                if (file) {
                    return (
                        <ColumnSelector
                            comparisonFile={file}
                            onCompare={handleProcess}
                            onBack={handleRestart}
                        />
                    );
                }
                return null;
            case AppStep.PROCESSING:
                return (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg shadow-md">
                        <SpinnerIcon className="w-12 h-12 text-blue-600 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800">Finding Duplicates...</h2>
                        <p className="text-gray-500 mt-2">Please wait while we process your file.</p>
                    </div>
                );
            case AppStep.RESULTS:
                if (results && file) {
                    return (
                         <ResultsDisplay
                            title="Processing Results"
                            description={
                                <>
                                Found <span className="font-bold text-blue-600">{results.totalDuplicates}</span> duplicates in{' '}
                                <span className="font-bold">{file.name}</span>.
                                </>
                            }
                            headers={file.headers}
                            tabs={[
                                { title: 'Duplicates Found', data: results.duplicates, badgeType: 'danger' },
                                { title: 'Cleaned Data', data: results.cleanedData, badgeType: 'success' },
                            ]}
                            downloadableData={results.cleanedData}
                            fileForExportName={file.name}
                            onRestart={handleRestart}
                        />
                    );
                }
                return null;
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
             <header className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white">Single File Duplicate Remover</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Upload a single spreadsheet to find and remove duplicate rows based on selected columns.
                </p>
            </header>
            
            {renderContent()}
        </div>
    );
};

export default SingleFileDuplicateRemover;
