import React, { useState, useEffect } from 'react';
import { ParsedFile, ComparisonOptions, DuplicateResult, AppStep } from '../../types';
import { FileUploader } from '../FileUploader';
import { ColumnSelector } from '../ColumnSelector';
import { ResultsDisplay } from '../ResultsDisplay';
import { Button } from '../ui/Button';
import { ArrowRightIcon } from '../ui/Icons';
import { findUniqueAndCommonRows } from '../../services/duplicateDetector';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';

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
        const comparisonResults = findUniqueAndCommonRows(mainFile, comparisonFile, selectedColumns, options);
        setResults(comparisonResults);
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
                title="Base File"
                description="The main file to compare against."
                onFileUpload={handleMainFileUpload}
              />
              <FileUploader
                id="comparison-file"
                title="Source File"
                description="The file to check for unique rows."
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
        return <ProcessingIndicator title="Finding Unique Rows..." description="Please wait while we process your files." />;
      case AppStep.RESULTS:
        if (results && comparisonFile) {
          const uniqueRows = results.cleanedData;
          const commonRows = results.duplicates;
          const totalUnique = uniqueRows.length;
          const totalCommon = commonRows.length;

          let description;
          if (totalUnique === 0 && totalCommon > 0) {
              description = <>All <span className="font-bold text-blue-400">{totalCommon}</span> rows in <span className="font-bold text-gray-200">{comparisonFile.name}</span> were found in the base file. No unique rows detected.</>;
          } else if (totalCommon === 0 && totalUnique > 0) {
              description = <>Success! All <span className="font-bold text-green-400">{totalUnique}</span> rows in <span className="font-bold text-gray-200">{comparisonFile.name}</span> are unique.</>;
          } else if (totalCommon === 0 && totalUnique === 0) {
              description = <>The source file <span className="font-bold text-gray-200">{comparisonFile.name}</span> is empty.</>;
          }
          else {
              description = <>Processed <span className="font-bold text-gray-200">{comparisonFile.name}</span>: found <span className="font-bold text-green-400">{totalUnique} unique rows</span> and <span className="font-bold text-blue-400">{totalCommon} common rows</span>.</>;
          }

          const tabs = [];
          if (totalUnique > 0 || totalCommon > 0) {
            tabs.push({ title: 'Unique Rows', data: uniqueRows, badgeType: 'success' as const });
            tabs.push({ title: 'Common Rows', data: commonRows, badgeType: 'default' as const });
          }
          
          return (
            <ResultsDisplay
              title="Comparison Results"
              description={description}
              headers={comparisonFile.headers}
              tabs={tabs}
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
      <ToolHeader 
        title="Find Unique Rows Between Two Files" 
        description="Compare a 'source' file against a 'base' file. This tool will show you which rows from the source file are unique (not found in the base file)." 
      />
      {renderContent()}
    </div>
  );
};

export default CompareFilesTool;
