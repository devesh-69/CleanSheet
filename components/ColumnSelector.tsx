import React, { useState, useMemo } from 'react';
import { ComparisonOptions, ParsedFile } from '../types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './tools/ui/Card';
import { Button } from './tools/ui/Button';
import { Toggle } from './tools/ui/Toggle';
import { PlusCircleIcon, XCircleIcon } from './tools/ui/Icons';

interface ColumnSelectorProps {
  mainFile?: ParsedFile | null;
  comparisonFile: ParsedFile;
  onCompare: (options: ComparisonOptions) => void;
  onBack: () => void;
}

const ColumnList: React.FC<{
    title: string;
    description: string;
    columns: string[];
    selected: string[];
    onToggle: (column: string) => void;
    onSelectAll: (checked: boolean) => void;
}> = ({ title, description, columns, selected, onToggle, onSelectAll }) => (
    <div>
        <h4 className="text-lg font-semibold text-gray-200">{title}</h4>
        <p className="text-sm text-gray-400 mb-3">{description}</p>
        <div className="border border-white/10 rounded-lg p-4 max-h-60 overflow-y-auto">
            <div className="flex items-center border-b border-white/10 pb-2 mb-2">
                <input
                    type="checkbox"
                    id={`select-all-${title}`}
                    checked={columns.length > 0 && selected.length === columns.length}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"
                />
                <label htmlFor={`select-all-${title}`} className="ml-3 block text-sm font-medium text-gray-300">
                    Select All ({columns.length} columns)
                </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {columns.map(col => (
                    <div key={col} className="flex items-center">
                        <input
                            type="checkbox"
                            id={`col-${title}-${col}`}
                            checked={selected.includes(col)}
                            onChange={() => onToggle(col)}
                            className="h-4 w-4 rounded border-gray-500 text-blue-500 bg-transparent focus:ring-blue-500"
                        />
                        <label htmlFor={`col-${title}-${col}`} className="ml-3 block text-sm text-gray-300 truncate" title={col}>
                            {col}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    </div>
);


export const ColumnSelector: React.FC<ColumnSelectorProps> = ({ mainFile, comparisonFile, onCompare, onBack }) => {
  const allColumns = useMemo(() => {
    if (mainFile) {
        const mainHeaders = new Set(mainFile.headers);
        return comparisonFile.headers.filter(header => mainHeaders.has(header));
    }
    return comparisonFile.headers;
  }, [mainFile, comparisonFile]);

  const [primaryColumns, setPrimaryColumns] = useState<string[]>(allColumns);
  const [secondaryColumns, setSecondaryColumns] = useState<string[]>([]);
  
  const [options, setOptions] = useState<Omit<ComparisonOptions, 'primaryColumns' | 'secondaryColumns'>>({
    caseSensitive: false,
    trimWhitespace: true,
    ignoreSpecialChars: false,
    matchingMode: 'fuzzy',
    fuzzyThreshold: 0.8,
  });
  
  const handleToggle = (list: 'primary' | 'secondary', column: string) => {
    const setList = list === 'primary' ? setPrimaryColumns : setSecondaryColumns;
    const otherList = list === 'primary' ? secondaryColumns : primaryColumns;
    const setOtherList = list === 'primary' ? setSecondaryColumns : setPrimaryColumns;

    setList(prev => {
        if (prev.includes(column)) {
            return prev.filter(c => c !== column);
        }
        // Ensure a column isn't in both lists
        if (otherList.includes(column)) {
            setOtherList(o => o.filter(c => c !== column));
        }
        return [...prev, column];
    });
  };

  const handleSelectAll = (list: 'primary' | 'secondary', checked: boolean) => {
      const setList = list === 'primary' ? setPrimaryColumns : setSecondaryColumns;
      const otherList = list === 'primary' ? secondaryColumns : primaryColumns;
      const setOtherList = list === 'primary' ? setSecondaryColumns : setPrimaryColumns;
      
      if (checked) {
          setList(allColumns);
          setOtherList([]);
      } else {
          setList([]);
      }
  };


  const handleCompare = () => {
    onCompare({ ...options, primaryColumns, secondaryColumns });
  };

  const showPerfWarning = comparisonFile.rowCount > 5000 && (options.matchingMode !== 'exact' || secondaryColumns.length > 0);

  return (
    <Card className="w-full max-w-4xl mx-auto animate-slide-in">
      <CardHeader>
        <CardTitle>{mainFile ? 'Configure Hierarchical Comparison' : 'Configure Hierarchical Duplicate Check'}</CardTitle>
        <CardDescription>
          Define primary (exact match) and secondary (advanced match) criteria for a more nuanced comparison.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <ColumnList 
            title="Primary Match Columns (Exact)"
            description="Rows must match exactly on these columns first."
            columns={allColumns}
            selected={primaryColumns}
            onToggle={(col) => handleToggle('primary', col)}
            onSelectAll={(checked) => handleSelectAll('primary', checked)}
        />
        <ColumnList 
            title="Secondary Match Columns (Advanced)"
            description="Within exact primary matches, find duplicates using advanced logic on these columns."
            columns={allColumns}
            selected={secondaryColumns}
            onToggle={(col) => handleToggle('secondary', col)}
            onSelectAll={(checked) => handleSelectAll('secondary', checked)}
        />
        
        <div>
            <h4 className="text-lg font-semibold mb-3 text-gray-200">Advanced Matching Mode (for Secondary Columns)</h4>
            <div className="flex space-x-2 rounded-lg bg-white/5 p-1">
                {(['fuzzy', 'phonetic'] as const).map(mode => (
                    <button key={mode} onClick={() => setOptions(o => ({...o, matchingMode: mode}))}
                        className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${options.matchingMode === mode ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-white/10'}`}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                ))}
            </div>
            {options.matchingMode === 'fuzzy' && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg space-y-2 border border-white/10">
                    <label htmlFor="fuzzy-threshold" className="block text-sm text-gray-300">Similarity Threshold: <span className="font-bold text-blue-400">{(options.fuzzyThreshold * 100).toFixed(0)}%</span></label>
                    <p className="text-xs text-gray-400">Finds matches that are at least this similar. Higher is stricter.</p>
                    <input type="range" id="fuzzy-threshold" min="50" max="100"
                        value={options.fuzzyThreshold * 100}
                        onChange={e => setOptions(o => ({...o, fuzzyThreshold: parseInt(e.target.value) / 100}))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
            )}
            {showPerfWarning && (
                <p className="text-sm text-yellow-400 text-center mt-4 p-2 bg-yellow-500/10 rounded-lg">
                    Warning: Advanced matching on large files ({comparisonFile.rowCount} rows) can be slow.
                </p>
            )}
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-3 text-gray-200">Shared Options</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <label htmlFor="trim-whitespace" className="text-sm text-gray-300">Ignore leading/trailing whitespace</label>
              <Toggle id="trim-whitespace" checked={options.trimWhitespace} onChange={(e) => setOptions(o => ({...o, trimWhitespace: e.target.checked}))} />
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <label htmlFor="case-sensitive" className="text-sm text-gray-300">Case-sensitive matching (Primary columns only)</label>
              <Toggle id="case-sensitive" checked={options.caseSensitive} onChange={(e) => setOptions(o => ({...o, caseSensitive: e.target.checked}))} />
            </div>
             <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <label htmlFor="ignore-special-chars" className="text-sm text-gray-300">Ignore special characters (A-Z, 0-9)</label>
                <Toggle id="ignore-special-chars" checked={options.ignoreSpecialChars} onChange={(e) => setOptions(o => ({...o, ignoreSpecialChars: e.target.checked}))} />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="secondary" onClick={onBack}>Back</Button>
        <Button onClick={handleCompare} disabled={primaryColumns.length === 0 && secondaryColumns.length === 0}>
          Find Duplicates
        </Button>
      </CardFooter>
    </Card>
  );
};