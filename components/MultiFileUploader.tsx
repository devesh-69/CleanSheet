import React, { useState, useCallback } from 'react';
import { ParsedFile } from '../types';
import { processFile } from '../services/fileProcessor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { UploadCloudIcon, FileIcon, CheckCircleIcon, XCircleIcon, SpinnerIcon } from './ui/Icons';

interface FileStatus {
    id: string;
    file: File;
    status: 'pending' | 'loading' | 'success' | 'error';
    data: ParsedFile | null;
    error: string | null;
}

interface MultiFileUploaderProps {
  onFilesChange: (files: ParsedFile[]) => void;
  title?: string;
  description?: string;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const MultiFileUploader: React.FC<MultiFileUploaderProps> = ({ 
    onFilesChange, 
    title = "Upload Files", 
    description = "Select or drop the spreadsheet files you want to process."
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

  const updateFileStatus = (id: string, updates: Partial<FileStatus>) => {
    setFileStatuses(prev => prev.map(fs => fs.id === id ? { ...fs, ...updates } : fs));
  };
  
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFileStatuses = Array.from(files).map(file => ({
        id: `${file.name}-${file.lastModified}`,
        file,
        status: 'loading' as const,
        data: null,
        error: null
    }));

    // Use a function for setFileStatuses to avoid stale state issues with the async loop
    setFileStatuses(prev => [...prev, ...newFileStatuses]);

    for (const fs of newFileStatuses) {
        try {
            const parsed = await processFile(fs.file);
            updateFileStatus(fs.id, { status: 'success', data: parsed });
        } catch (err: any) {
            updateFileStatus(fs.id, { status: 'error', error: err.message || 'An unknown error occurred.' });
        }
    }
    
  }, []);

  React.useEffect(() => {
    const successfulUploads = fileStatuses
      .filter(fs => fs.status === 'success' && fs.data !== null)
      .map(fs => fs.data as ParsedFile);
    onFilesChange(successfulUploads);
  }, [fileStatuses, onFilesChange]);
  
  const removeFile = (id: string) => {
    setFileStatuses(prev => prev.filter(fs => fs.id !== id));
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { handleFiles(e.target.files); };
  
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
          onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
        >
          <input id="multi-file-upload" type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleChange} multiple />
          <label htmlFor="multi-file-upload" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
            <UploadCloudIcon className="w-12 h-12 text-gray-400" />
            <p className="text-sm text-gray-300"><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">XLSX, XLS, or CSV</p>
          </label>
        </div>
        {fileStatuses.length > 0 && (
          <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
            {fileStatuses.map(fs => (
              <div key={fs.id} className="flex items-center p-3 bg-white/5 rounded-lg animate-slide-in">
                <FileIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{fs.file.name}</p>
                  <div className="text-xs text-gray-400">
                    {fs.status === 'loading' && <span className="flex items-center"><SpinnerIcon className="w-4 h-4 mr-1" />Processing...</span>}
                    {fs.status === 'error' && <span className="text-red-400">{fs.error}</span>}
                    {fs.status === 'success' && fs.data && <span className="text-green-400">{fs.data.rowCount} rows, {formatBytes(fs.data.size)}</span>}
                  </div>
                </div>
                <button onClick={() => removeFile(fs.id)} className="ml-4 text-gray-400 hover:text-red-400">
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};