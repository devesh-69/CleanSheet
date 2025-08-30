import React, { useState } from 'react';
import { ParsedFile, MergeAnalysisReport } from '../../../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Info } from '../ui/Info';

interface MergeAnalysisProps {
    files: ParsedFile[];
    analysis: MergeAnalysisReport;
    initialPrimaryKeys: string[];
    initialOptions: { addSourceColumn: boolean };
    onProcess: (primaryKeys: string[], options: { addSourceColumn: boolean }) => void;
    onBack: () => void;
}

export const MergeAnalysis: React.FC<MergeAnalysisProps> = ({ files, analysis, initialPrimaryKeys, initialOptions, onProcess, onBack }) => {
    const [primaryKeys, setPrimaryKeys] = useState<string[]>(initialPrimaryKeys);
    const [options, setOptions] = useState(initialOptions);

    const handleKeyToggle = (key: string) => {
        setPrimaryKeys(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        setPrimaryKeys(checked ? analysis.commonColumns.map(c => c.columnName) : []);
    };
    
    return (
        <Card className="w-full max-w-4xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Merge Analysis & Configuration</CardTitle>
                <CardDescription>
                    We've analyzed the columns shared across all {files.length} files. Select one or more columns to use as a Primary Key for merging.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-200 flex items-center">
                        Select Primary Key Columns
                        <Info text="A Primary Key uniquely identifies a row. Rows with the same Primary Key will be merged. Good keys have high uniqueness and high overlap." />
                    </h4>
                    <div className="border border-white/10 rounded-lg max-h-80 overflow-y-auto">
                        <table className="min-w-full divide-y divide-white/10">
                            <thead className="glass-card sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input 
                                            type="checkbox" 
                                            className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"
                                            checked={analysis.commonColumns.length > 0 && primaryKeys.length === analysis.commonColumns.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Column Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                        Overlap <Info text="Percentage of values in this column that are present in all files." />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                        Uniqueness <Info text="Ratio of unique values to total rows. A value of 1.0 means every row is unique." />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.commonColumns.map(col => (
                                    <tr key={col.columnName} className="hover:bg-white/5">
                                        <td className="px-4 py-3">
                                            <input 
                                                type="checkbox" 
                                                className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"
                                                checked={primaryKeys.includes(col.columnName)}
                                                onChange={() => handleKeyToggle(col.columnName)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-200 font-medium">{col.columnName}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                            <div className="flex items-center">
                                                <div className="w-24 bg-gray-700 rounded-full h-2.5">
                                                    <div className="bg-blue-500 h-2.5 rounded-full" style={{width: `${col.overlapPercentage}%`}}></div>
                                                </div>
                                                <span className="ml-3">{col.overlapPercentage}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{col.uniqueValueRatio.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {analysis.commonColumns.length === 0 && <p className="text-center p-6 text-gray-400">No common columns found across all files.</p>}
                    </div>
                </div>

                <div>
                    <h4 className="text-lg font-semibold mb-3 text-gray-200">Merge Options</h4>
                     <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <label htmlFor="add-source-col" className="text-sm text-gray-300">Add a column with original file name</label>
                        <Toggle id="add-source-col" checked={options.addSourceColumn} onChange={(e) => setOptions(o => ({...o, addSourceColumn: e.target.checked}))} />
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="secondary" onClick={onBack}>Back to Upload</Button>
                <Button onClick={() => onProcess(primaryKeys, options)} disabled={primaryKeys.length === 0}>
                    Merge Files
                </Button>
            </CardFooter>
        </Card>
    );
};
