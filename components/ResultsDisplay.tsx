
import React, { useState } from 'react';
import { DuplicateResult, ParsedFile } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { DownloadIcon } from './ui/Icons';
import { exportFile } from '../services/duplicateDetector';

interface ResultsDisplayProps {
  results: DuplicateResult;
  comparisonFile: ParsedFile;
  onRestart: () => void;
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results, comparisonFile, onRestart }) => {
  const [activeTab, setActiveTab] = useState<'duplicates' | 'cleaned'>('duplicates');

  const headers = comparisonFile.headers;
  const dataToDisplay = activeTab === 'duplicates' ? results.duplicates : results.cleanedData;
  const totalRows = dataToDisplay.length;
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedData = dataToDisplay.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleDownload = (format: 'xlsx' | 'csv') => {
    const originalName = comparisonFile.name.split('.')[0];
    const fileName = `${originalName}_cleaned.${format}`;
    exportFile(results.cleanedData, fileName, format);
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Comparison Results</CardTitle>
        <CardDescription>
          Found <span className="font-bold text-blue-600">{results.totalDuplicates}</span> duplicates in{' '}
          <span className="font-bold">{comparisonFile.name}</span> out of {results.totalRowsProcessed} total rows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => { setActiveTab('duplicates'); setCurrentPage(1); }}
                        className={`${activeTab === 'duplicates' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Duplicates Found <span className="bg-red-100 text-red-800 text-xs font-medium ml-2 px-2.5 py-0.5 rounded-full">{results.duplicates.length}</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('cleaned'); setCurrentPage(1); }}
                        className={`${activeTab === 'cleaned' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Cleaned Data <span className="bg-green-100 text-green-800 text-xs font-medium ml-2 px-2.5 py-0.5 rounded-full">{results.cleanedData.length}</span>
                    </button>
                </nav>
            </div>
            <div className="flex space-x-2">
              <Button variant="secondary" onClick={() => handleDownload('csv')}>
                <DownloadIcon className="w-4 h-4 mr-2"/>
                Download CSV
              </Button>
              <Button onClick={() => handleDownload('xlsx')}>
                <DownloadIcon className="w-4 h-4 mr-2"/>
                Download XLSX
              </Button>
            </div>
        </div>
        
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {headers.map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider truncate">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {headers.map(header => (
                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 truncate max-w-xs">
                      {String(row[header])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalRows > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-b-lg">
            <div className="flex-1 flex justify-between sm:hidden">
                <Button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Previous</Button>
                <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>Next</Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * rowsPerPage, totalRows)}</span> of{' '}
                        <span className="font-medium">{totalRows}</span> results
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <Button variant="secondary" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="rounded-r-none">Previous</Button>
                        <Button variant="secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="rounded-l-none">Next</Button>
                    </nav>
                </div>
            </div>
        </div>
        )}

      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onRestart}>Start New Comparison</Button>
      </CardFooter>
    </Card>
  );
};