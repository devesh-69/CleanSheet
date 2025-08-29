import React, { useState } from 'react';
import { ParsedFile, ComparisonOptions, DuplicateResult, AppStep } from '../../types';
import { FileUploader } from '../FileUploader';
import { ColumnSelector } from '../ColumnSelector';
import { ResultsDisplay } from '../ResultsDisplay';
import { findDuplicatesInSingleFile } from '../../services/duplicateDetector';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';

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
                return <ProcessingIndicator title="Finding Duplicates..." description="Please wait while we process your file." />;
            case AppStep.RESULTS:
                if (results && file) {
                    const tabs = results.totalDuplicates > 0
                        ? [
                            { title: 'Duplicates Found', data: results.duplicates, badgeType: 'danger' as const },
                            { title: 'Cleaned Data', data: results.cleanedData, badgeType: 'success' as const },
                            ]
                        : [
                            { title: 'No Duplicates Found', data: results.cleanedData, badgeType: 'success' as const },
                            ];
                    
                    return (
                         <ResultsDisplay
                            title="Processing Results"
                            description={
                                <>
                                Found <span className="font-bold text-blue-400">{results.totalDuplicates}</span> duplicates in{' '}
                                <span className="font-bold text-gray-200">{file.name}</span>.
                                </>
                            }
                            headers={file.headers}
                            tabs={tabs}
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
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <ToolHeader
                title="Single File Duplicate Remover"
                description="Upload a single spreadsheet to find and remove duplicate rows based on selected columns."
            />
            {renderContent()}
        </div>
    );
};

export default SingleFileDuplicateRemover;
