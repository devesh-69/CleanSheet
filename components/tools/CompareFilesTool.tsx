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
  const [compareOnly, setCompareOnly] = useState(false);

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
    setCompareOnly(false);
  };

  const renderContent = () => {
    switch (step) {
      case AppStep.UPLOAD:
        return (
          <>
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
            <div className="mt-8 flex flex-col items-end space-y-4">
              <Button onClick={handleProceedToSelect} disabled={!mainFile || !comparisonFile || !!mainFileError || !!comparisonFileError}>
                Compare & Remove Duplicates <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
              <div className="flex items-center">
                <label htmlFor="compare-only" className="text-sm text-gray-600 mr-3">Compare Only (don’t remove)</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="compare-only" className="sr-only peer" checked={compareOnly} onChange={(e) => setCompareOnly(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </>
        );
      case AppStep.SELECT_COLUMNS:
        if (mainFile && comparisonFile) {
          return <ColumnSelector mainFile={mainFile} comparisonFile={comparisonFile} onCompare={handleCompare} onBack={() => setStep(AppStep.UPLOAD)} />;
        }
        return null;
      case AppStep.PROCESSING:
        return (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-lg shadow-md">
            <SpinnerIcon className="w-12 h-12 text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Finding Duplicates...</h2>
            <p className="text-gray-500 mt-2">Please wait while we process your files.</p>
          </div>
        );
      case AppStep.RESULTS:
        if (results && comparisonFile) {
          return <ResultsDisplay results={results} comparisonFile={comparisonFile} onRestart={handleRestart} compareOnly={compareOnly} />;
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white">Excel Duplicate Remover</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Compare two spreadsheet files, identify duplicates based on selected columns, and download the cleaned data—all in your browser.
        </p>
      </header>
      {renderContent()}
    </div>
  );
};

export default CompareFilesTool;
