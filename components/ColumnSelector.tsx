import React, { useState, useMemo } from 'react';
import { ComparisonOptions, ParsedFile } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';

// FIX: Define the props interface for the ColumnSelector component.
interface ColumnSelectorProps {
  mainFile?: ParsedFile | null;
  comparisonFile: ParsedFile;
  onCompare: (selectedColumns: string[], options: ComparisonOptions) => void;
  onBack: () => void;
}

const ModernToggle: React.FC<{ id: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, checked, onChange }) => (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" id={id} className="sr-only peer" checked={checked} onChange={onChange} />
        <div className="w-11 h-6 bg-gray-200/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r from-blue-500 to-purple-600"></div>
    </label>
);

export const ColumnSelector: React.FC<ColumnSelectorProps> = ({ mainFile, comparisonFile, onCompare, onBack }) => {
  const columns = useMemo(() => {
    if (mainFile) {
        const mainHeaders = new Set(mainFile.headers);
        return comparisonFile.headers.filter(header => mainHeaders.has(header));
    }
    return comparisonFile.headers;
  }, [mainFile, comparisonFile]);

  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns);
  const [options, setOptions] = useState<ComparisonOptions>({
    caseSensitive: false,
    trimWhitespace: true,
    ignoreSpecialChars: false,
  });

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedColumns(columns);
    } else {
        setSelectedColumns([]);
    }
  };

  const handleCompare = () => {
    onCompare(selectedColumns, options);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto animate-slide-in">
      <CardHeader>
        <CardTitle>{mainFile ? 'Select Columns to Compare' : 'Select Columns for Duplicate Check'}</CardTitle>
        <CardDescription>
          {mainFile 
            ? 'Choose the columns that should be used to identify duplicate rows. Only columns present in both files are shown.'
            : 'Choose the columns that should be used to identify duplicate rows within your file.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h4 className="text-lg font-semibold mb-3 text-gray-200">{mainFile ? 'Comparison Columns' : 'Columns to Check'}</h4>
          <div className="border border-white/10 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="flex items-center border-b border-white/10 pb-2 mb-2">
                <input
                    type="checkbox"
                    id="select-all"
                    checked={columns.length > 0 && selectedColumns.length === columns.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"
                />
                <label htmlFor="select-all" className="ml-3 block text-sm font-medium text-gray-300">
                    Select All ({columns.length} columns)
                </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
              {columns.map(col => (
                <div key={col} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`col-${col}`}
                    checked={selectedColumns.includes(col)}
                    onChange={() => handleColumnToggle(col)}
                    className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"
                  />
                  <label htmlFor={`col-${col}`} className="ml-3 block text-sm text-gray-300 truncate" title={col}>
                    {col}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-3 text-gray-200">Matching Options</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <label htmlFor="trim-whitespace" className="text-sm text-gray-300">Ignore leading/trailing whitespace</label>
              <ModernToggle id="trim-whitespace" checked={options.trimWhitespace} onChange={(e) => setOptions(o => ({...o, trimWhitespace: e.target.checked}))} />
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <label htmlFor="case-sensitive" className="text-sm text-gray-300">Case-sensitive matching</label>
              <ModernToggle id="case-sensitive" checked={options.caseSensitive} onChange={(e) => setOptions(o => ({...o, caseSensitive: e.target.checked}))} />
            </div>
             <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <label htmlFor="ignore-special-chars" className="text-sm text-gray-300">Ignore special characters (A-Z, 0-9)</label>
                <ModernToggle id="ignore-special-chars" checked={options.ignoreSpecialChars} onChange={(e) => setOptions(o => ({...o, ignoreSpecialChars: e.target.checked}))} />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={handleCompare} disabled={selectedColumns.length === 0}>
          Find Duplicates
        </Button>
      </CardFooter>
    </Card>
  );
};