import React, { useState } from 'react';
import { ParsedFile } from '../../types';
import { FileUploader } from '../FileUploader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';

const cleaningOptions = [
    { id: 'blankRows', label: 'Remove Blank Rows/Columns' },
    { id: 'trimSpaces', label: 'Trim Extra Spaces' },
    { id: 'standardizeCase', label: 'Standardize Case (Proper)' },
    { id: 'formatDate', label: 'Date Formatter' },
    { id: 'formatNumber', label: 'Number Formatter' },
    { id: 'highlightDuplicates', label: 'Highlight Duplicates' },
    { id: 'extractUniques', label: 'Extract Unique Values' },
];

const SingleFileDuplicateRemover: React.FC = () => {
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set(['trimSpaces']));

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        setFile(uploadedFile);
        setError(uploadError);
    };

    const handleOptionToggle = (optionId: string) => {
        setSelectedOptions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(optionId)) {
                newSet.delete(optionId);
            } else {
                newSet.add(optionId);
            }
            return newSet;
        });
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
             <header className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white">Single File Duplicate Remover</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Upload a single spreadsheet to find and remove duplicate rows, with optional cleaning actions.
                </p>
            </header>
            
            {!file && (
                 <FileUploader
                    id="single-file"
                    title="Upload File"
                    description="Upload the spreadsheet you want to clean."
                    onFileUpload={handleFileUpload}
                />
            )}

            {file && (
                <Card>
                    <CardHeader>
                        <CardTitle>Optional Cleaning Actions</CardTitle>
                        <CardDescription>Select additional cleaning steps to apply to your file: <span className="font-semibold">{file.name}</span></CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cleaningOptions.map(option => (
                                <div key={option.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <input
                                        type="checkbox"
                                        id={option.id}
                                        checked={selectedOptions.has(option.id)}
                                        onChange={() => handleOptionToggle(option.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor={option.id} className="ml-3 block text-sm text-gray-700 dark:text-gray-300">
                                        {option.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button variant="secondary" onClick={() => setFile(null)}>Upload Different File</Button>
                        <Button>Process File</Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
};

export default SingleFileDuplicateRemover;
