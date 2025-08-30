import React, { useState, useCallback } from 'react';
import { ParsedFile, DataType } from '../types';
import { processFile } from '../services/fileProcessor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './tools/ui/Card';
import { UploadCloudIcon, FileIcon, CheckCircleIcon, XCircleIcon, TableIcon, SpinnerIcon, PieChartIcon } from './tools/ui/Icons';
import { Button } from './tools/ui/Button';

interface FileUploaderProps {
  id: string;
  title: string;
  description: string;
  onFileUpload: (file: ParsedFile | null, error: string | null) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FileInfo: React.FC<{ fileData: ParsedFile }> = ({ fileData }) => {
    const typeCounts = Object.values(fileData.columnTypes).reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<DataType, number>);
    const typeSummary = Object.entries(typeCounts).map(([type, count]) => `${count} ${type}`).join(', ');

    return (
        <div className="mt-4 text-sm text-gray-300 space-y-2 animate-slide-in">
            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                <FileIcon className="w-5 h-5 text-gray-400" />
                <span className="font-semibold truncate">{fileData.name}</span>
                <span className="ml-auto text-xs text-gray-400">{formatBytes(fileData.size)}</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg">
                <TableIcon className="w-5 h-5 text-gray-400" />
                <span>{fileData.rowCount} rows, {fileData.columnCount} columns</span>
            </div>
            <div className="flex items-start gap-2 p-3 bg-white/5 rounded-lg">
                <PieChartIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                    <span className="font-semibold">Column Types Detected</span>
                    <p className="text-xs text-gray-400">{typeSummary}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-400 rounded-lg">
                <CheckCircleIcon className="w-5 h-5" />
                <span>Successfully processed</span>
            </div>
        </div>
    );
};


export const FileUploader: React.FC<FileUploaderProps> = ({ id, title, description, onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileData, setFileData] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [showCustomDelimiter, setShowCustomDelimiter] = useState(false);
  const [customDelimiter, setCustomDelimiter] = useState('');

  const attemptParse = useCallback(async (fileToParse: File, delimiter?: string) => {
    setIsLoading(true);
    setError(null);
    setShowCustomDelimiter(false);
    
    try {
      const parsed = await processFile(fileToParse, delimiter);
      setFileData(parsed);
      onFileUpload(parsed, null);
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred.';
      setError(errorMessage);
      setFileData(null);
      onFileUpload(null, errorMessage);
      if (errorMessage.includes("custom one")) {
        setShowCustomDelimiter(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onFileUpload]);
  
  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    setRawFile(file);
    setFileData(null);
    setError(null);
    setShowCustomDelimiter(false);
    setCustomDelimiter('');
    attemptParse(file);
  }, [attemptParse]);

  const handleReparse = () => {
    if (rawFile && customDelimiter) {
      attemptParse(rawFile, customDelimiter);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
      e.target.value = ''; // Reset file input
    }
  };
  
  const borderAnimation = isDragging ? 'animate-border-breathing' : '';
  const bgColor = isDragging ? 'bg-blue-500/10' : 'bg-transparent';

  return (
    <Card className="w-full animate-slide-in">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed ${borderAnimation} ${bgColor} rounded-lg p-8 text-center transition-all duration-300`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            id={id}
            type="file"
            className="hidden"
            accept=".xlsx, .xls, .csv, .tsv, .json"
            onChange={handleChange}
            disabled={isLoading}
          />
          <label htmlFor={id} className="cursor-pointer">
            <div className="flex flex-col items-center justify-center space-y-2">
              <UploadCloudIcon className="w-12 h-12 text-gray-400" />
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-blue-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">XLSX, XLS, CSV, TSV, or JSON</p>
            </div>
          </label>
        </div>
        {isLoading && (
            <div className="mt-4 flex items-center justify-center text-sm text-gray-400">
                <SpinnerIcon className="w-5 h-5 mr-2" />
                <span>Processing file...</span>
            </div>
        )}
        {error && (
          <div className="mt-4 text-sm text-red-400 flex items-start gap-2 p-3 bg-red-500/10 rounded-lg animate-slide-in">
            <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {showCustomDelimiter && !isLoading && (
          <div className="mt-4 p-4 bg-blue-500/10 rounded-lg space-y-3 animate-slide-in border border-blue-500/30">
            <label htmlFor="custom-delimiter" className="block text-sm font-medium text-blue-300">Enter Custom Delimiter</label>
            <div className="flex gap-2">
              <input
                id="custom-delimiter"
                type="text"
                value={customDelimiter}
                onChange={(e) => setCustomDelimiter(e.target.value)}
                placeholder="e.g., Tab"
                maxLength={5}
                className="w-full p-2 border rounded-md bg-transparent border-white/20 text-white focus:ring-blue-500 focus:border-blue-500"
              />
              <Button onClick={handleReparse} disabled={!customDelimiter || isLoading}>
                Re-parse
              </Button>
            </div>
            <p className="text-xs text-blue-400/80">Note: For Tab separated values, type the word 'Tab'.</p>
          </div>
        )}
        {fileData && <FileInfo fileData={fileData} />}
      </CardContent>
    </Card>
  );
};