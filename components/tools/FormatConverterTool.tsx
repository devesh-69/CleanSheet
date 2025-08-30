import React, { useState } from 'react';
import { ParsedFile, AppStep } from '../../types';
import { FileUploader } from '../FileUploader';
import { FilePreview } from '../FilePreview';
import { ToolHeader } from '../ToolHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { DownloadIcon } from './ui/Icons';
import { exportFile } from '../../services/fileProcessor';

const DownloadSelector: React.FC<{ file: ParsedFile, onRestart: () => void }> = ({ file, onRestart }) => {
    const handleDownload = (format: 'xlsx' | 'csv' | 'tsv' | 'json') => {
        const originalName = file.name.split('.').slice(0, -1).join('.') || file.name;
        const fileName = `${originalName}.${format}`;
        exportFile(file.data, fileName, format);
    };

    return (
        <Card className="w-full max-w-2xl mx-auto animate-slide-in">
            <CardHeader>
                <CardTitle>Conversion Complete</CardTitle>
                <CardDescription>Your file is ready. Select a format to download.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <Button onClick={() => handleDownload('xlsx')} variant="secondary" className="flex-col h-24"><DownloadIcon className="w-8 h-8 mb-2" />XLSX</Button>
                    <Button onClick={() => handleDownload('csv')} variant="secondary" className="flex-col h-24"><DownloadIcon className="w-8 h-8 mb-2" />CSV</Button>
                    <Button onClick={() => handleDownload('tsv')} variant="secondary" className="flex-col h-24"><DownloadIcon className="w-8 h-8 mb-2" />TSV</Button>
                    <Button onClick={() => handleDownload('json')} variant="secondary" className="flex-col h-24"><DownloadIcon className="w-8 h-8 mb-2" />JSON</Button>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={onRestart}>Convert another file</Button>
            </CardFooter>
        </Card>
    );
};


const FormatConverterTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);

    const handleFileUpload = (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.PREVIEW);
        }
    };
    
    const handleRestart = () => {
        setStep(AppStep.UPLOAD);
        setFile(null);
    };

    const renderContent = () => {
        switch (step) {
            case AppStep.UPLOAD:
                return (
                    <FileUploader
                        id="format-converter-file"
                        title="Upload File"
                        description="Upload a spreadsheet in any supported format (XLSX, CSV, TSV, JSON)."
                        onFileUpload={handleFileUpload}
                    />
                );
            case AppStep.PREVIEW:
                if (file) {
                    return <FilePreview file={file} onConfirm={() => setStep(AppStep.RESULTS)} onBack={handleRestart} />;
                }
                return null;
            case AppStep.RESULTS:
                if (file) {
                    return <DownloadSelector file={file} onRestart={handleRestart} />;
                }
                return null;
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <ToolHeader
                title="Format Conversion Pipeline"
                description="Seamlessly convert your spreadsheet files between XLSX, CSV, TSV, and JSON formats."
            />
            {renderContent()}
        </div>
    );
};

export default FormatConverterTool;