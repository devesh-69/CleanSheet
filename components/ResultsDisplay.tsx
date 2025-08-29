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
  fileForExportName: string;
  onRestart: () => void;
  restartButtonText?: string;
}

const Badge: React.FC<{ type: ResultTab['badgeType'], count: number }> = ({ type, count }) => {
    const baseClasses = "text-xs font-medium ml-2 px-2.5 py-0.5 rounded-full";
    const styles = {
        danger: "bg-red-500/20 text-red-300",
        success: "bg-green-500/20 text-green-300",
        default: "bg-blue-500/20 text-blue-300",
    }
    return <span className={`${baseClasses} ${styles[type || 'default']}`}>{count}</span>
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ 
    title, description, headers, tabs, fileForExportName, onRestart, restartButtonText = "Start Over" 
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const activeTabData = tabs[activeTabIndex]?.data || [];
  const totalRows = activeTabData.length;
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const paginatedData = activeTabData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleDownload = (format: 'xlsx' | 'csv') => {
    const dataToExport = tabs[activeTabIndex]?.data;
    if (!dataToExport || dataToExport.length === 0) return;

    const originalName = fileForExportName.split('.')[0];
    const activeTabTitle = tabs[activeTabIndex]?.title.replace(/\s+/g, '_') || 'data';
    const fileName = `${originalName}_${activeTabTitle}.${format}`;

    exportFile(dataToExport, fileName, format);
  };

  const showTabs = tabs.length > 0;
  const canDownload = activeTabData.length > 0;

  return (
    <Card className="w-full max-w-6xl mx-auto animate-slide-in">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            {showTabs && (
                <div className="border-b border-white/10">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab, index) => (
                            tabs.length > 1 ? (
                                <button
                                    key={tab.title}
                                    onClick={() => { setActiveTabIndex(index); setCurrentPage(1); }}
                                    className={`${activeTabIndex === index ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                                >
                                    {tab.title} <Badge type={tab.badgeType} count={tab.data.length} />
                                </button>
                            ) : (
                                <span
                                    key={tab.title}
                                    className="border-blue-500 text-blue-400 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                                >
                                    {tab.title} <Badge type={tab.badgeType} count={tab.data.length} />
                                </span>
                            )
                        ))}
                    </nav>
                </div>
            )}
            {showTabs && (
                <div className={`flex space-x-2 ${!showTabs ? 'w-full justify-end' : ''}`}>
                <Button variant="secondary" onClick={() => handleDownload('csv')} disabled={!canDownload}>
                    <DownloadIcon className="w-4 h-4 mr-2"/>
                    Download CSV
                </Button>
                <Button onClick={() => handleDownload('xlsx')} disabled={!canDownload}>
                    <DownloadIcon className="w-4 h-4 mr-2"/>
                    Download XLSX
                </Button>
                </div>
            )}
        </div>
        
        <div className="overflow-x-auto border border-white/10 rounded-lg">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="glass-card rounded-t-lg">
              <tr>
                {headers.map(header => (
                  <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider truncate">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-white/5 transition-colors duration-200">
                  {headers.map(header => (
                    <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 truncate max-w-xs" title={String(row[header] ?? '')}>
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
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-6 mt-4">
            <div className="flex-1 flex justify-between sm:hidden">
                <Button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Previous</Button>
                <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>Next</Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-400">
                        Showing <span className="font-medium text-gray-200">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-medium text-gray-200">{Math.min(currentPage * rowsPerPage, totalRows)}</span> of{' '}
                        <span className="font-medium text-gray-200">{totalRows}</span> results
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
