import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { DownloadIcon } from './ui/Icons';
import { exportFile } from '../services/fileProcessor';

interface ResultTab {
    title: string;
    data: Record<string, any>[];
    badgeType?: 'success' | 'danger' | 'default';
}

interface ResultsDisplayProps {
  title: string;
  description: React.ReactNode;
  headers: string[];
  tabs: ResultTab[];
  downloadableData: Record<string, any>[] | null;
  fileForExportName: string;
  onRestart: () => void;
  restartButtonText?: string;
}

const Badge: React.FC<{ type: ResultTab['badgeType'], count: number }> = ({ type, count }) => {
    const baseClasses = "text-xs font-medium ml-2 px-2.5 py-0.5 rounded-full";
    const styles = {
        danger: "bg-red-100 text-red-800",
        success: "bg-green-100 text-green-800",
        default: "bg-blue-100 text-blue-800",
    }
    return <span className={`${baseClasses} ${styles[type || 'default']}`}>{count}</span>
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    title, description, headers, tabs, downloadableData, fileForExportName, onRestart, restartButtonText = "Start Over" 
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const activeTabData = tabs[activeTabIndex]?.data || [];
  const totalRows = activeTabData.length;
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedData = activeTabData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleDownload = (format: 'xlsx' | 'csv') => {
    if (!downloadableData) return;
    const originalName = fileForExportName.split('.')[0];
    const fileName = `${originalName}_processed.${format}`;
    exportFile(downloadableData, fileName, format);
  };

  const showTabs = tabs.length > 1;

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            {showTabs && (
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab, index) => (
                             <button
                                key={tab.title}
                                onClick={() => { setActiveTabIndex(index); setCurrentPage(1); }}
                                className={`${activeTabIndex === index ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.title} <Badge type={tab.badgeType} count={tab.data.length} />
                            </button>
                        ))}
                    </nav>
                </div>
            )}
            {downloadableData && (
                <div className={`flex space-x-2 ${!showTabs ? 'w-full justify-end' : ''}`}>
                <Button variant="secondary" onClick={() => handleDownload('csv')} disabled={downloadableData.length === 0}>
                    <DownloadIcon className="w-4 h-4 mr-2"/>
                    Download CSV
                </Button>
                <Button onClick={() => handleDownload('xlsx')} disabled={downloadableData.length === 0}>
                    <DownloadIcon className="w-4 h-4 mr-2"/>
                    Download XLSX
                </Button>
                </div>
            )}
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
                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 truncate max-w-xs" title={String(row[header] ?? '')}>
                      {String(row[header] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
               {paginatedData.length === 0 && (
                    <tr>
                        <td colSpan={headers.length} className="text-center py-10 text-gray-500">
                            No data to display in this view.
                        </td>
                    </tr>
                )}
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
        <Button onClick={onRestart}>{restartButtonText}</Button>
      </CardFooter>
    </Card>
  );
};
