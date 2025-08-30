import React, { useState } from 'react';
import { ParsedFile, AppStep, MergeResult, MergeAnalysisReport, MergeResolution } from '../../types';
import { MultiFileUploader } from '../MultiFileUploader';
import { ResultsDisplay } from '../ResultsDisplay';
import { mergeFiles, analyzeMergeability } from '../../services/dataCleaner';
import { Button } from './ui/Button';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { MergeAnalysis } from './merge/MergeAnalysis';
import { ConflictResolver } from './merge/ConflictResolver';

const MergeFilesTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [files, setFiles] = useState<ParsedFile[]>([]);
    const [analysis, setAnalysis] = useState<MergeAnalysisReport | null>(null);
    const [primaryKeys, setPrimaryKeys] = useState<string[]>([]);
    const [mergeOptions, setMergeOptions] = useState({ addSourceColumn: true });
    const [result, setResult] = useState<MergeResult | null>(null);
    const [finalMergedData, setFinalMergedData] = useState<Record<string, any>[] | null>(null);


    const handleFilesChange = (uploadedFiles: ParsedFile[]) => {
        setFiles(uploadedFiles);
    };
    
    const handleProceedToAnalysis = () => {
        if (files.length < 2) return;
        setStep(AppStep.PROCESSING);
        setTimeout(() => {
            const report = analyzeMergeability(files);
            setAnalysis(report);
            const suggestedKey = report.commonColumns.find(c => c.uniqueValueRatio > 0.8 && c.overlapPercentage > 50);
            setPrimaryKeys(suggestedKey ? [suggestedKey.columnName] : []);
            setStep(AppStep.ANALYZE_MERGE);
        }, 300);
    }

    const handleProcess = (keys: string[], options: { addSourceColumn: boolean }) => {
        setPrimaryKeys(keys);
        setMergeOptions(options);
        setStep(AppStep.PROCESSING);
        setTimeout(() => {
            const mergeResult = mergeFiles(files, keys, options);
            setResult(mergeResult);
            if (mergeResult.conflicts.length > 0) {
                setStep(AppStep.RESOLVE_CONFLICTS);
            } else {
                setFinalMergedData(mergeResult.mergedData);
                setStep(AppStep.RESULTS);
            }
        }, 500);
    };
    
    const handleResolutions = (resolutions: MergeResolution[]) => {
        if (!result) return;
        setStep(AppStep.PROCESSING);
        
        setTimeout(() => {
            const resolvedConflicts = new Map<number, Record<string, any>>();
            resolutions.forEach(res => {
                resolvedConflicts.set(res.conflictId, res.resolutions);
            });

            const resolvedData = result.conflicts.map(conflict => {
                const userResolutions = resolvedConflicts.get(conflict.id);
                const finalRow = { ...conflict.primaryKeyValues };

                const allColumnsInConflict = new Set<string>(conflict.conflictingFields.flatMap(f => f.values.map(v => v.fileName)));
                
                result.mergedHeaders.forEach(header => {
                    if (primaryKeys.includes(header) || header === 'Source File') return;
                    
                    const fieldConflict = conflict.conflictingFields.find(f => f.column === header);
                    if (fieldConflict) {
                        finalRow[header] = userResolutions?.[header] ?? fieldConflict.values[0]?.value;
                    } else {
                        // For non-conflicting fields, find the first available value from any file
                        for (const file of files) {
                            const key = primaryKeys.map(k => conflict.primaryKeyValues[k] ?? '').join('||');
                            const originalRow = file.data.find(r => primaryKeys.map(k => r[k] ?? '').join('||') === key);
                            if (originalRow && originalRow[header] !== undefined) {
                                finalRow[header] = originalRow[header];
                                break;
                            }
                        }
                    }
                });

                if (mergeOptions.addSourceColumn) {
                    finalRow['Source File'] = "Multiple";
                }
                return finalRow;
            });

            const combinedData = [...result.mergedData, ...resolvedData];
            setFinalMergedData(combinedData);
            setStep(AppStep.RESULTS);
        }, 500);
    };

    const handleRestart = () => {
        setStep(AppStep.UPLOAD);
        setFiles([]);
        setAnalysis(null);
        setPrimaryKeys([]);
        setMergeOptions({ addSourceColumn: true });
        setResult(null);
        setFinalMergedData(null);
    };

    const renderContent = () => {
        switch (step) {
            case AppStep.UPLOAD:
                return (
                    <div className="max-w-2xl mx-auto space-y-4 animate-slide-in">
                        <MultiFileUploader onFilesChange={handleFilesChange} description="Select or drop the spreadsheet files you want to merge."/>
                        <div className="flex justify-end">
                            <Button onClick={handleProceedToAnalysis} disabled={files.length < 2}>
                                Proceed to Analysis
                            </Button>
                        </div>
                    </div>
                );
            case AppStep.ANALYZE_MERGE:
                 if (analysis) {
                    return <MergeAnalysis
                                files={files}
                                analysis={analysis}
                                initialPrimaryKeys={primaryKeys}
                                initialOptions={mergeOptions}
                                onProcess={handleProcess}
                                onBack={() => setStep(AppStep.UPLOAD)}
                            />;
                }
                return null;
            case AppStep.RESOLVE_CONFLICTS:
                if (result) {
                    return <ConflictResolver 
                                conflicts={result.conflicts}
                                primaryKeyColumns={primaryKeys}
                                files={files}
                                onResolve={handleResolutions}
                                onBack={() => setStep(AppStep.ANALYZE_MERGE)}
                            />;
                }
                return null;
            case AppStep.PROCESSING:
                return <ProcessingIndicator title="Merging Files..." description="Please wait while we combine your spreadsheets." />;
            case AppStep.RESULTS:
                if (finalMergedData && result) {
                    const conflictCount = result.conflicts.length;
                    return <ResultsDisplay 
                        title="Your Merged File is Ready"
                        description={
                            <>
                                We've successfully merged <span className="font-bold text-gray-200">{files.length}</span> files into a single dataset.
                                {conflictCount > 0 && ` You resolved ${conflictCount} conflicts.`}
                            </>
                        }
                        headers={result.mergedHeaders}
                        tabs={[{ title: 'Merged Data', data: finalMergedData, badgeType: 'success' }]}
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
                description="Combine multiple CSV or Excel files into one using a primary key, with intelligent conflict resolution."
            />
            {renderContent()}
        </div>
    );
};

export default MergeFilesTool;