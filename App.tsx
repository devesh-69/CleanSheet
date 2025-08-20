
import React, { useState, useCallback } from 'react';
import { ParsedFile, ComparisonOptions, DuplicateResult, AppStep } from './types';
import { FileUploader } from './components/FileUploader';
import { ColumnSelector } from './components/ColumnSelector';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Button } from './components/ui/Button';
import { ArrowRightIcon, SpinnerIcon } from './components/ui/Icons';
import { findDuplicates } from './services/duplicateDetector';


const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [mainFile, setMainFile] = useState<ParsedFile | null>(null);
  const [comparisonFile, setComparisonFile] = useState<ParsedFile | null>(null);
  const [results, setResults] = useState<DuplicateResult | null>(null);
  const [mainFileError, setMainFileError] = useState<string | null>(null);
  const [comparisonFileError, setComparisonFileError] = useState<string | null>(null);
  
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
      // Simulate processing time for better UX
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

  const renderStep = () => {
    switch (step) {
      case AppStep.UPLOAD:
        return (
          <div className="w-full max-w-5xl mx-auto space-y-8">
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
            {mainFile && comparisonFile && !mainFileError && !comparisonFileError && (
              <div className="flex justify-end">
                <Button onClick={handleProceedToSelect}>
                  Select Columns <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
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
          return <ResultsDisplay results={results} comparisonFile={comparisonFile} onRestart={handleRestart} />;
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-foreground p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Excel Duplicate Remover</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          Compare two spreadsheet files, identify duplicates based on selected columns, and download the cleaned data—all in your browser.
        </p>
      </header>
      <main className="flex justify-center items-start">
        {renderStep()}
      </main>
      <footer className="text-center mt-12 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Excel Duplicate Remover. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;