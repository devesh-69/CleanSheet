import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ParsedWorkbook, ParsedSheet, DashboardFilter, FilterOperator, DashboardSort, ChartConfig, ChartType, AggregationType } from '../../types';
import { processWorkbook } from '../../services/fileProcessor';
import { ToolHeader } from '../ToolHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { SpinnerIcon, UploadCloudIcon, XCircleIcon, DownloadIcon, SparklesIcon } from '../ui/Icons';

declare const Chart: any;
declare const jsPDF: any;
declare const XLSX: any;

const CHART_COLORS = [
    'rgba(59, 130, 246, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 
    'rgba(239, 68, 68, 0.7)', 'rgba(249, 115, 22, 0.7)', 'rgba(245, 158, 11, 0.7)', 
    'rgba(236, 72, 153, 0.7)', 'rgba(99, 102, 241, 0.7)'
];
const CHART_BORDER_COLORS = CHART_COLORS.map(c => c.replace('0.7', '1'));


const DashboardUploader: React.FC<{ onUpload: (workbook: ParsedWorkbook) => void, onSetError: (error: string | null) => void, onSetLoading: (loading: boolean) => void }> = ({ onUpload, onSetError, onSetLoading }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleFile = useCallback(async (file: File | null) => {
        if (!file) return;
        onSetLoading(true);
        onSetError(null);
        try {
            const parsed = await processWorkbook(file);
            onUpload(parsed);
        } catch (err: any) {
            onSetError(err.message || 'An unknown error occurred.');
        } finally {
            onSetLoading(false);
        }
    }, [onUpload, onSetError, onSetLoading]);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]); };

    return (
        <div className={`border-2 border-dashed ${isDragging ? 'animate-border-breathing' : ''} ${isDragging ? 'bg-blue-500/10' : ''} rounded-lg p-8 text-center transition-all duration-300`} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
            <input id="dashboard-uploader" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleChange} />
            <label htmlFor="dashboard-uploader" className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                <UploadCloudIcon className="w-12 h-12 text-gray-400" />
                <p className="text-sm text-gray-300"><span className="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500">Excel files (.xlsx, .xls)</p>
            </label>
        </div>
    );
};

const DashboardTool: React.FC = () => {
    const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
    const [activeSheetName, setActiveSheetName] = useState<string>('');
    const [filters, setFilters] = useState<DashboardFilter[]>([]);
    const [sort, setSort] = useState<DashboardSort | null>(null);
    const [chartConfig, setChartConfig] = useState<ChartConfig>({ type: 'bar', xAxisColumn: '', yAxisColumn: '', aggregation: 'count' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 50;

    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);

    const activeSheet: ParsedSheet | undefined = useMemo(() => {
        return workbook?.sheets.find(s => s.sheetName === activeSheetName);
    }, [workbook, activeSheetName]);

    const columnTypes = useMemo(() => {
        if (!activeSheet || activeSheet.data.length < 5) return {};
        const types: Record<string, 'numerical' | 'categorical'> = {};
        const sampleSize = Math.min(50, activeSheet.data.length);
        const sampleRows = activeSheet.data.slice(0, sampleSize);

        for (const header of activeSheet.headers) {
            let numericCount = 0;
            let nonNullCount = 0;
            for (const row of sampleRows) {
                const value = row[header];
                if (value !== null && value !== '' && value !== undefined) {
                    nonNullCount++;
                    if (!isNaN(parseFloat(String(value))) && isFinite(Number(value))) {
                        numericCount++;
                    }
                }
            }
            if (nonNullCount > 4 && (numericCount / nonNullCount) > 0.8) {
                types[header] = 'numerical';
            } else {
                types[header] = 'categorical';
            }
        }
        return types;
    }, [activeSheet]);
    
    const categoricalColumns = useMemo(() => Object.keys(columnTypes).filter(k => columnTypes[k] === 'categorical'), [columnTypes]);
    const numericalColumns = useMemo(() => Object.keys(columnTypes).filter(k => columnTypes[k] === 'numerical'), [columnTypes]);

    useEffect(() => {
        if (workbook && workbook.sheets.length > 0) {
            const firstSheet = workbook.sheets[0];
            setActiveSheetName(firstSheet.sheetName);
            setFilters([]);
            setSort(null);
            
            const firstCat = categoricalColumns[0] || firstSheet.headers[0] || '';
            const firstNum = numericalColumns[0] || firstSheet.headers.find(h => h !== firstCat) || '';

            setChartConfig({ type: 'bar', xAxisColumn: firstCat, yAxisColumn: firstNum, aggregation: 'count' });
        }
    }, [workbook, columnTypes]); // Depends on columnTypes now

    const filteredData = useMemo(() => {
        if (!activeSheet) return [];
        let data = [...activeSheet.data];
        if (filters.length > 0) {
            return data.filter(row => filters.every(filter => {
                if (!filter.column || !filter.operator) return true;
                const cellValue = row[filter.column];
                const filterValue = filter.value;
                const cellStr = String(cellValue).toLowerCase();
                const filterStr = String(filterValue).toLowerCase();

                switch (filter.operator) {
                    case 'equals': return cellStr === filterStr;
                    case 'not_equals': return cellStr !== filterStr;
                    case 'contains': return cellStr.includes(filterStr);
                    case 'not_contains': return !cellStr.includes(filterStr);
                    case 'starts_with': return cellStr.startsWith(filterStr);
                    case 'ends_with': return cellStr.endsWith(filterStr);
                    case '>': return Number(cellValue) > Number(filterValue);
                    case '<': return Number(cellValue) < Number(filterValue);
                    case '>=': return Number(cellValue) >= Number(filterValue);
                    case '<=': return Number(cellValue) <= Number(filterValue);
                    default: return true;
                }
            }));
        }
        return data;
    }, [activeSheet, filters]);
    
    const sortedData = useMemo(() => {
        if (!sort || !sort.column) return filteredData;
        return [...filteredData].sort((a, b) => {
            const valA = a[sort.column];
            const valB = b[sort.column];
            const isNumeric = columnTypes[sort.column] === 'numerical';

            if (isNumeric) {
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (numA < numB) return sort.direction === 'asc' ? -1 : 1;
                if (numA > numB) return sort.direction === 'asc' ? 1 : -1;
                return 0;
            } else {
                if (String(valA) < String(valB)) return sort.direction === 'asc' ? -1 : 1;
                if (String(valA) > String(valB)) return sort.direction === 'asc' ? 1 : -1;
                return 0;
            }
        });
    }, [filteredData, sort, columnTypes]);

    const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE);
    const paginatedData = useMemo(() => {
        return sortedData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
    }, [sortedData, currentPage]);
    
    const aggregatedData = useMemo(() => {
        if (!sortedData.length || !chartConfig.xAxisColumn || !chartConfig.yAxisColumn || chartConfig.aggregation === 'none') {
            return sortedData.map(row => ({ x: row[chartConfig.xAxisColumn], y: row[chartConfig.yAxisColumn] }));
        }

        const groups = sortedData.reduce((acc, row) => {
            const key = row[chartConfig.xAxisColumn];
            if (!acc[key]) acc[key] = [];
            acc[key].push(row[chartConfig.yAxisColumn]);
            return acc;
        }, {} as Record<string, any[]>);

        return Object.entries(groups).map(([key, values]) => {
            let aggregatedValue = 0;
            const numericValues = values.map(v => parseFloat(String(v))).filter(v => !isNaN(v));

            switch (chartConfig.aggregation) {
                case 'count':
                    aggregatedValue = values.length;
                    break;
                case 'sum':
                    aggregatedValue = numericValues.reduce((a, b) => a + b, 0);
                    break;
                case 'average':
                    aggregatedValue = numericValues.length ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
                    break;
            }
            return { x: key, y: aggregatedValue };
        }).sort((a, b) => b.y - a.y); // Sort by value desc
    }, [sortedData, chartConfig]);
    
    const keyInsights = useMemo(() => {
        if (aggregatedData.length < 2) return [];
        const insights = [];
        const top5 = aggregatedData.slice(0, 5);
        insights.push(`Top category is '${top5[0].x}' with a value of ${top5[0].y.toLocaleString()}.`);
        if(chartConfig.aggregation === 'average') {
             const totalAvg = aggregatedData.reduce((acc, item) => acc + item.y, 0) / aggregatedData.length;
             insights.push(`The overall average value across categories is ${totalAvg.toLocaleString(undefined, {maximumFractionDigits: 2})}.`);
        } else if (chartConfig.aggregation === 'sum') {
            const totalSum = aggregatedData.reduce((acc, item) => acc + item.y, 0);
            insights.push(`The total sum across all categories is ${totalSum.toLocaleString()}.`);
        }
        return insights;
    }, [aggregatedData, chartConfig.aggregation]);

    useEffect(() => {
        if (!chartCanvasRef.current || !aggregatedData.length) return;
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();

        const ctx = chartCanvasRef.current.getContext('2d');
        if (!ctx) return;
        
        let chartData, chartOptions = {};

        if (chartConfig.type === 'scatter') {
             chartData = {
                datasets: [{
                    label: `${chartConfig.yAxisColumn} vs ${chartConfig.xAxisColumn}`,
                    data: aggregatedData,
                    backgroundColor: CHART_COLORS[0],
                }]
            };
        } else {
            const labels = aggregatedData.map(d => d.x);
            const data = aggregatedData.map(d => d.y);
             chartData = {
                labels,
                datasets: [{
                    label: `${chartConfig.aggregation} of ${chartConfig.yAxisColumn}`,
                    data,
                    backgroundColor: chartConfig.type === 'pie' ? CHART_COLORS : CHART_COLORS[0],
                    borderColor: chartConfig.type === 'pie' ? CHART_BORDER_COLORS : CHART_BORDER_COLORS[0],
                    borderWidth: 1
                }]
            };
        }

        chartInstanceRef.current = new Chart(ctx, {
            type: chartConfig.type,
            data: chartData,
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#d1d5db' } } },
                scales: chartConfig.type !== 'pie' ? {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                } : undefined
            }
        });
        
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [aggregatedData, chartConfig]);


    const addFilter = () => setFilters(f => [...f, { id: Date.now(), column: activeSheet?.headers[0] || '', operator: 'equals', value: '' }]);
    const removeFilter = (id: number) => setFilters(f => f.filter(filter => filter.id !== id));
    const updateFilter = (id: number, field: keyof DashboardFilter, value: any) => {
        setFilters(f => f.map(filter => filter.id === id ? { ...filter, [field]: value } : filter));
    };
    
    const handleChartConfigChange = (field: keyof ChartConfig, value: any) => {
        setChartConfig(c => {
            const newConfig = {...c, [field]: value};
            if (field === 'type') {
                 if (value === 'scatter') {
                     newConfig.aggregation = 'none';
                     newConfig.xAxisColumn = numericalColumns[0] || '';
                     newConfig.yAxisColumn = numericalColumns[1] || '';
                 } else {
                     newConfig.aggregation = c.aggregation === 'none' ? 'count' : c.aggregation;
                     newConfig.xAxisColumn = categoricalColumns[0] || '';
                     newConfig.yAxisColumn = numericalColumns[0] || '';
                 }
            }
            return newConfig;
        });
    }

    const handleExport = async (format: 'xlsx' | 'xlsm' | 'pdf') => {
        if (!workbook || !activeSheet) return;
        setExporting(true);

        const baseName = workbook.fileName.split('.')[0];
        const fileName = `${baseName}_${activeSheetName}_dashboard`;
        
        try {
            if (format === 'xlsx' || format === 'xlsm') {
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeSheet.data), "Raw Data");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sortedData), "Processed Data");
                if (aggregatedData.length > 0 && chartConfig.type !== 'scatter') {
                    const chartDataSheet = aggregatedData.map(d => ({ [chartConfig.xAxisColumn]: d.x, [`${chartConfig.aggregation}_of_${chartConfig.yAxisColumn}`]: d.y }));
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chartDataSheet), "Chart Data");
                }
                XLSX.writeFile(wb, `${fileName}.${format}`, { bookType: format as 'xlsx' | 'xlsm' });

            } else if (format === 'pdf') {
                const doc = new jsPDF.jsPDF({ orientation: 'landscape' });
                doc.text(`Dashboard for: ${workbook.fileName} - ${activeSheetName}`, 14, 16);
                if (chartCanvasRef.current) doc.addImage(chartCanvasRef.current.toDataURL('image/png', 1.0), 'PNG', 14, 24, 270, 100);
                doc.addPage();
                doc.text('Processed Data Table', 14, 16);
                doc.autoTable({
                    head: [activeSheet.headers],
                    body: sortedData.map(row => activeSheet.headers.map(h => row[h])),
                    startY: 24, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [22, 160, 133] }
                });
                doc.save(`${fileName}.pdf`);
            }
        } catch (e) { console.error("Export failed", e); setError("An error occurred during export."); } 
        finally { setExporting(false); }
    };

    if (!workbook) {
        return (
            <div className="w-full max-w-5xl mx-auto space-y-8">
                <ToolHeader title="Interactive Dashboard" description="Upload a multi-sheet Excel file to instantly generate interactive dashboards. Apply filters, sort data, and create visualizations in real-time." />
                <Card>
                    <CardContent className="p-6">
                        {loading ? <div className="text-center p-8"><SpinnerIcon className="w-8 h-8 mx-auto" /></div> : <DashboardUploader onUpload={setWorkbook} onSetError={setError} onSetLoading={setLoading} />}
                        {error && <div className="mt-4 text-sm text-red-400 p-3 bg-red-500/10 rounded-lg">{error}</div>}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ToolHeader title="Interactive Dashboard" description={`Visualizing: ${workbook.fileName}`} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* --- Controls Panel --- */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <Card className="sticky top-6">
                        <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
                        <CardContent className="space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="text-sm font-medium text-gray-300">Sheet</label>
                                <select value={activeSheetName} onChange={e => setActiveSheetName(e.target.value)} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white">
                                    {workbook.sheets.map(s => <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>)}
                                </select>
                            </div>
                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-200">Filters</h4>
                                {filters.map(f => (
                                    <div key={f.id} className="p-3 bg-white/5 rounded-lg space-y-2">
                                        <div className="flex justify-between items-center"><select value={f.column} onChange={e => updateFilter(f.id, 'column', e.target.value)} className="w-full p-2 border rounded-md bg-transparent border-white/20 text-white">{activeSheet?.headers.map(h => <option key={h} value={h}>{h}</option>)}</select><button onClick={() => removeFilter(f.id)} className="ml-2 text-gray-400 hover:text-red-400"><XCircleIcon className="w-5 h-5"/></button></div>
                                        <div className="flex gap-2"><select value={f.operator} onChange={e => updateFilter(f.id, 'operator', e.target.value)} className="w-1/2 p-2 border rounded-md bg-transparent border-white/20 text-white"><option value="equals">Equals</option><option value="not_equals">Not Equals</option><option value="contains">Contains</option><option value="not_contains">Not Contains</option><option value="starts_with">Starts With</option><option value="ends_with">Ends With</option><option value=">">&gt;</option><option value="<">&lt;</option><option value=">=">&gt;=</option><option value="<=">&lt;=</option></select><input type="text" value={f.value} onChange={e => updateFilter(f.id, 'value', e.target.value)} placeholder="Value" className="w-1/2 p-2 border rounded-md bg-transparent border-white/20 text-white"/></div>
                                    </div>
                                ))}
                                <Button variant="secondary" onClick={addFilter}>Add Filter</Button>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-200">Sort</h4>
                                <div className="flex gap-2"><select value={sort?.column || ''} onChange={e => setSort(s => ({...s, column: e.target.value, direction: s?.direction || 'asc'}))} className="w-2/3 p-2 border rounded-md bg-transparent border-white/20 text-white"><option value="">-- No Sort --</option>{activeSheet?.headers.map(h => <option key={h} value={h}>{h}</option>)}</select><select value={sort?.direction || 'asc'} onChange={e => setSort(s => ({...s, direction: e.target.value as 'asc' | 'desc', column: s?.column || ''}))} disabled={!sort?.column} className="w-1/3 p-2 border rounded-md bg-transparent border-white/20 text-white"><option value="asc">Asc</option><option value="desc">Desc</option></select></div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-200">Visualization</h4>
                                <div><label className="text-xs text-gray-400">Chart Type</label><select value={chartConfig.type} onChange={e => handleChartConfigChange('type', e.target.value)} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white"><option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option><option value="scatter">Scatter</option></select></div>
                                {chartConfig.type !== 'scatter' && <div><label className="text-xs text-gray-400">Aggregation</label><select value={chartConfig.aggregation} onChange={e => handleChartConfigChange('aggregation', e.target.value)} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white"><option value="count">Count</option><option value="sum">Sum</option><option value="average">Average</option></select></div>}
                                <div><label className="text-xs text-gray-400">{chartConfig.type === 'scatter' ? 'X-Axis (Numerical)' : 'X-Axis (Category)'}</label><select value={chartConfig.xAxisColumn} onChange={e => handleChartConfigChange('xAxisColumn', e.target.value)} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white">{(chartConfig.type === 'scatter' ? numericalColumns : categoricalColumns).map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                                <div><label className="text-xs text-gray-400">Y-Axis (Value)</label><select value={chartConfig.yAxisColumn} onChange={e => handleChartConfigChange('yAxisColumn', e.target.value)} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white">{numericalColumns.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Dashboard Display --- */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                            <div><CardTitle>Dashboard</CardTitle><CardDescription>Showing {sortedData.length} of {activeSheet?.data.length} rows</CardDescription></div>
                            <div className="flex gap-2"><Button variant="secondary" onClick={() => handleExport('pdf')} disabled={exporting}>{exporting ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <DownloadIcon className="w-4 h-4 mr-2" />} PDF</Button><Button variant="secondary" onClick={() => handleExport('xlsx')} disabled={exporting}>{exporting ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <DownloadIcon className="w-4 h-4 mr-2" />} XLSX</Button><Button onClick={() => handleExport('xlsm')} disabled={exporting}>{exporting ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <DownloadIcon className="w-4 h-4 mr-2" />} XLSM</Button></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-96 w-full"><canvas ref={chartCanvasRef}></canvas></div>
                            {keyInsights.length > 0 && (
                                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                    <h4 className="font-semibold text-gray-200 flex items-center mb-2"><SparklesIcon className="w-5 h-5 mr-2 text-yellow-400"/> Key Insights</h4>
                                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">{keyInsights.map((insight, i) => <li key={i}>{insight}</li>)}</ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Data Table</CardTitle></CardHeader>
                        <CardContent>
                            <div className="max-h-[60vh] overflow-auto"><table className="min-w-full divide-y divide-white/10"><thead className="sticky top-0 glass-card"><tr>{activeSheet?.headers.map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/10">{paginatedData.map((row, i) => (<tr key={i} className="hover:bg-white/5">{activeSheet?.headers.map(h => <td key={h} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 truncate max-w-xs" title={String(row[h] ?? '')}>{String(row[h] ?? '')}</td>)}</tr>))}</tbody></table>{sortedData.length === 0 && <p className="text-center text-gray-500 py-10">No data matches the current filters.</p>}</div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-6 mt-4">
                                    <div><p className="text-sm text-gray-400">Showing <span className="font-medium text-gray-200">{(currentPage - 1) * ROWS_PER_PAGE + 1}</span> to <span className="font-medium text-gray-200">{Math.min(currentPage * ROWS_PER_PAGE, sortedData.length)}</span> of <span className="font-medium text-gray-200">{sortedData.length}</span> results</p></div>
                                    <div><nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"><Button variant="secondary" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="rounded-r-none">Previous</Button><Button variant="secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="rounded-l-none">Next</Button></nav></div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardTool;