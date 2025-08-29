
import React, { useState, useCallback } from 'react';
import { ParsedFile } from '../types';
import { processFile } from '../services/fileProcessor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { UploadCloudIcon, FileIcon, CheckCircleIcon, XCircleIcon, TableIcon, SpinnerIcon } from './ui/Icons';

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

const FileInfo: React.FC<{ fileData: ParsedFile }> = ({ fileData }) => (
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
        <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-400 rounded-lg">
            <CheckCircleIcon className="w-5 h-5" />
            <span>Successfully processed</span>
        </div>
    </div>
);


export const FileUploader: React.FC<FileUploaderProps> = ({ id, title, description, onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileData, setFileData] = useState<ParsedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = useCallback(async (file: File | null) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setFileData(null);

    try {
      const parsed = await processFile(file);
      setFileData(parsed);
      onFileUpload(parsed, null);
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred.';
      setError(errorMessage);
      onFileUpload(null, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onFileUpload]);

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
            accept=".xlsx, .xls, .csv"
            onChange={handleChange}
            disabled={isLoading}
          />
          <label htmlFor={id} className="cursor-pointer">
            <div className="flex flex-col items-center justify-center space-y-2">
              <UploadCloudIcon className="w-12 h-12 text-gray-400" />
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-blue-400">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">XLSX, XLS, or CSV</p>
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
          <div className="mt-4 text-sm text-red-400 flex items-center gap-2 p-3 bg-red-500/10 rounded-lg animate-slide-in">
            <XCircleIcon className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}
        {fileData && <FileInfo fileData={fileData} />}
      </CardContent>
    </Card>
  );
};