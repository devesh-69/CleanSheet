import React, { useState, useEffect } from 'react';
import { ParsedFile, ComparisonOptions, DuplicateResult, AppStep } from '../../types';
import { FileUploader } from '../FileUploader';
import { ColumnSelector } from '../ColumnSelector';
import { ResultsDisplay } from '../ResultsDisplay';
import { Button } from '../ui/Button';
import { ArrowRightIcon, SpinnerIcon } from '../ui/Icons';
import { findDuplicates } from '../../services/duplicateDetector';

const CompareFilesTool: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [mainFile, setMainFile] = useState<ParsedFile | null>(null);
  const [comparisonFile, setComparisonFile] = useState<ParsedFile | null>(null);
  const [results, setResults] = useState<DuplicateResult | null>(null);
  const [mainFileError, setMainFileError] = useState<string | null>(null);
  const [comparisonFileError, setComparisonFileError] = useState<string | null>(null);

  // Reset state on component mount
  useEffect(() => {
    return () => {
      handleRestart();
    };
  }, []);

  const handleMainFileUpload = (file: ParsedFile | null, error: string | null) => {
    setMainFile(file);
    setMainFileError(error);
  };
  
  const handleComparisonFileUpload = (file: ParsedFile | null, error: string | null) => {
    setComparisonFile(file);
    setComparisonFileError(error);
  };

  const handleProceedToSelect = () => {
    if (mainFile && comparisonFile) {
      setStep(AppStep.SELECT_COLUMNS);
    }
  };

  const handleCompare = (selectedColumns: string[], options: ComparisonOptions) => {
    if (mainFile && comparisonFile) {
      setStep(AppStep.PROCESSING);
      setTimeout(() => {
        const duplicateResults = findDuplicates(mainFile, comparisonFile, selectedColumns, options);
        setResults(duplicateResults);
        setStep(AppStep.RESULTS);
      }, 500);
    }
  };

  const handleRestart = () => {
    setStep(AppStep.UPLOAD);
    setMainFile(null);
    setComparisonFile(null);
    setResults(null);
    setMainFileError(null);
    setComparisonFileError(null);
  };

  const renderContent = () => {
    switch (step) {
      case AppStep.UPLOAD:
        return (
          <div className="animate-slide-in">
            <div className="grid md:grid-cols-2 gap-8">
              <FileUploader
                id="main-file"
                title="Main File"
                description="The reference file that remains unchanged."
                onFileUpload={handleMainFileUpload}
              />
              <FileUploader
                id="comparison-file"
                title="Comparison File"
                description="The file to be processed and cleaned."
                onFileUpload={handleComparisonFileUpload}
              />
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={handleProceedToSelect} disabled={!mainFile || !comparisonFile || !!mainFileError || !!comparisonFileError}>
                Select Columns <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
      case AppStep.SELECT_COLUMNS:
        if (mainFile && comparisonFile) {
          return <ColumnSelector mainFile={mainFile} comparisonFile={comparisonFile} onCompare={handleCompare} onBack={() => setStep(AppStep.UPLOAD)} />;
        }
        return null;
      case AppStep.PROCESSING:
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 glass-card rounded-lg shadow-md animate-slide-in">
            <SpinnerIcon className="w-12 h-12 text-blue-400 mb-4" />
            <h2 className="text-xl font-semibold text-white">Finding Duplicates...</h2>
            <p className="text-gray-400 mt-2">Please wait while we process your files.</p>
          </div>
        );
      case AppStep.RESULTS:
        if (results && comparisonFile) {
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
              title="Comparison Results"
              description={
                <>
                  Found <span className="font-bold text-blue-400">{results.totalDuplicates}</span> duplicates in{' '}
                  <span className="font-bold text-gray-200">{comparisonFile.name}</span> out of {results.totalRowsProcessed} total rows.
                </>
              }
              headers={comparisonFile.headers}
              tabs={tabs}
              downloadableData={results.cleanedData}
              fileForExportName={comparisonFile.name}
              onRestart={handleRestart}
              restartButtonText="Start New Comparison"
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
      <header className="text-center animate-slide-in">
        <h1 className="text-5xl font-extrabold tracking-tight gradient-text">Compare Two Files & Remove Duplicates</h1>
        <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
          Compare a 'comparison' file against a 'main' file to find and remove duplicate rows.
        </p>
      </header>
      {renderContent()}
    </div>
  );
};

export default CompareFilesTool;