import React, { useState } from 'react';
import { ParsedFile, ComparisonOptions, DuplicateReportResult, AppStep } from '../../types';
import { FileUploader } from '../FileUploader';
import { ColumnSelector } from '../ColumnSelector';
import { ResultsDisplay } from '../ResultsDisplay';
import { generateDuplicateReport } from '../../services/duplicateDetector';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { FilePreview } from '../FilePreview';

const ExportDuplicatesTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [results, setResults] = useState<DuplicateReportResult | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.PREVIEW);
        }
    };

    const handleProcess = (options: ComparisonOptions) => {
        if (file) {
            setStep(AppStep.PROCESSING);
            setTimeout(() => {
                const reportResults = generateDuplicateReport(file, options);
                setResults(reportResults);
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
                        id="single-file-report"
                        title="Upload File"
                        description="Upload the spreadsheet to generate a duplicate report from."
                        onFileUpload={handleFileUpload}
                    />
                );
            case AppStep.PREVIEW:
                if (file) {
                    return (
                        <FilePreview
                            file={file}
                            onConfirm={() => setStep(AppStep.SELECT_COLUMNS)}
                            onBack={handleRestart}
                        />
                    );
                }
                return null;
            case AppStep.SELECT_COLUMNS:
                if (file) {
                    return (
                        <ColumnSelector
                            comparisonFile={file}
                            onCompare={handleProcess}
                            onBack={() => setStep(AppStep.PREVIEW)}
                        />
                    );
                }
                return null;
            case AppStep.PROCESSING:
                return <ProcessingIndicator title="Generating Report..." description="Please wait while we analyze your file for duplicates." />;
            case AppStep.RESULTS:
                if (results && file) {
                    const reportHeaders = results.reportData.length > 0 
                        ? Object.keys(results.reportData[0])
                        : file.headers;
                    
                    return (
                         <ResultsDisplay
                            title="Duplicate Report"
                            description={
                                <>
                                Found <span className="font-bold text-blue-400">{results.totalDuplicateRows}</span> duplicate rows across{' '}
                                <span className="font-bold text-blue-400">{results.totalDuplicateGroups}</span> groups in{' '}
                                <span className="font-bold text-gray-200">{file.name}</span>.
                                </>
                            }
                            headers={reportHeaders}
                            tabs={[{ title: 'Duplicate Report', data: results.reportData, badgeType: 'danger' }]}
                            fileForExportName="duplicate_report"
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
                title="Export Duplicates as Report"
                description="Find and group all duplicate rows based on selected columns. The result is a report that you can review and export."
            />
            {renderContent()}
        </div>
    );
};

export default ExportDuplicatesTool;