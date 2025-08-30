
import React from 'react';
import { ParsedFile } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './tools/ui/Card';
import { Button } from './tools/ui/Button';

interface FilePreviewProps {
  file: ParsedFile;
  onConfirm: () => void;
  onBack: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, onConfirm, onBack }) => {
  const previewData = file.data.slice(0, 100);

  return (
    <Card className="w-full max-w-6xl mx-auto animate-slide-in">
      <CardHeader>
        <CardTitle>File Preview: <span className="text-blue-400 font-medium">{file.name}</span></CardTitle>
        <CardDescription>
          Showing the first {previewData.length} rows of your file. Please verify that the columns and data have been parsed correctly before proceeding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border border-white/10 rounded-lg max-h-[60vh]">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="glass-card rounded-t-lg sticky top-0">
              <tr>
                {file.headers.map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider truncate">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {previewData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-white/5 transition-colors duration-200">
                  {file.headers.map(header => (
                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 truncate max-w-xs" title={String(row[header] ?? '')}>
                      {String(row[header] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>Upload a different file</Button>
        <Button onClick={onConfirm}>Confirm & Continue</Button>
      </CardFooter>
    </Card>
  );
};
