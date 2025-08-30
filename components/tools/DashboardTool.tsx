import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ParsedWorkbook, ParsedSheet, DashboardFilter, FilterOperator, DashboardSort, ChartConfig, ChartType } from '../../types';
import { processWorkbook, exportFile } from '../../services/fileProcessor';
import { ToolHeader } from '../ToolHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { SpinnerIcon, UploadCloudIcon, XCircleIcon, DownloadIcon } from '../ui/Icons';

// FIX: Make sure Chart and jsPDF are declared for TypeScript, as they come from CDNs.
declare const Chart: any;
declare const jsPDF: any;
declare const XLSX: any;


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
    const [chartConfig, setChartConfig] = useState<ChartConfig>({ type: 'bar', xAxisColumn: '', yAxisColumn: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);

    const activeSheet: ParsedSheet | undefined = useMemo(() => {
        return workbook?.sheets.find(s => s.sheetName === activeSheetName);
    }, [workbook, activeSheetName]);

    const numericColumns = useMemo(() => {
        if (!activeSheet || activeSheet.data.length === 0) return [];
        const sample = activeSheet.data[0];
        return activeSheet.headers.filter(h => typeof sample[h] === 'number');
    }, [activeSheet]);

    // Initialize state when a new workbook is loaded
    useEffect(() => {
        if (workbook && workbook.sheets.length > 0) {
            const firstSheet = workbook.sheets[0];
            setActiveSheetName(firstSheet.sheetName);
            setFilters([]);
            setSort(null);
            
            const firstHeader = firstSheet.headers[0] || '';
            const firstNumericHeader = numericColumns[0] || firstSheet.headers[1] || '';

            setChartConfig({ type: 'bar', xAxisColumn: firstHeader, yAxisColumn: firstNumericHeader });
        }
    }, [workbook, numericColumns]);

    const processedData = useMemo(() => {
        if (!activeSheet) return [];
        let data = [...activeSheet.data];

        // Apply filters
        if (filters.length > 0) {
            data = data.filter(row => {
                return filters.every(filter => {
                    if (!filter.column || !filter.operator) return true;
                    const cellValue = row[filter.column];
                    const filterValue = filter.value;
                    const cellStr = String(cellValue).toLowerCase();
                    const filterStr = String(filterValue).toLowerCase();

                    switch (filter.operator) {
                        case 'equals': return cellValue == filterValue;
                        case 'not_equals': return cellValue != filterValue;
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
                });
            });
        }

        // Apply sorting
        if (sort && sort.column) {
            data.sort((a, b) => {
                const valA = a[sort.column];
                const valB = b[sort.column];
                if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [activeSheet, filters, sort]);
    
    // Chart rendering logic
    useEffect(() => {
        if (!chartCanvasRef.current || !processedData.length || !chartConfig.xAxisColumn || !chartConfig.yAxisColumn) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const labels = processedData.map(row => row[chartConfig.xAxisColumn]);
        const data = processedData.map(row => row[chartConfig.yAxisColumn]);

        const ctx = chartCanvasRef.current.getContext('2d');
        if (!ctx) return;

        chartInstanceRef.current = new Chart(ctx, {
            type: chartConfig.type,
            data: {
                labels,
                datasets: [{
                    label: `${chartConfig.yAxisColumn} by ${chartConfig.xAxisColumn}`,
                    data,
                    backgroundColor: 'rgba(96, 165, 250, 0.5)',
                    borderColor: 'rgba(96, 165, 250, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#d1d5db' }}},
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                }
            }
        });
        
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };

    }, [processedData, chartConfig]);


    const addFilter = () => setFilters(f => [...f, { id: Date.now(), column: activeSheet?.headers[0] || '', operator: 'equals', value: '' }]);
    const removeFilter = (id: number) => setFilters(f => f.filter(filter => filter.id !== id));
    const updateFilter = (id: number, field: keyof DashboardFilter, value: any) => {
        setFilters(f => f.map(filter => filter.id === id ? { ...filter, [field]: value } : filter));
    };

    const handleExport = async (format: 'xlsx' | 'csv' | 'pdf') => {
        if (!workbook || !activeSheet) return;
        setExporting(true);

        const baseName = workbook.fileName.split('.')[0];
        const fileName = `${baseName}_${activeSheetName}_dashboard`;
        
        try {
            if (format === 'csv') {
                exportFile(processedData, `${fileName}.csv`, 'csv');
            } else if (format === 'xlsx') {
                const wb = XLSX.utils.book_new();
                const rawWS = XLSX.utils.json_to_sheet(activeSheet.data);
                const processedWS = XLSX.utils.json_to_sheet(processedData);
                XLSX.utils.book_append_sheet(wb, rawWS, "Raw Data");
                XLSX.utils.book_append_sheet(wb, processedWS, "Processed Data");
                XLSX.writeFile(wb, `${fileName}.xlsx`);
            } else if (format === 'pdf') {
                const doc = new jsPDF.jsPDF({ orientation: 'landscape' });
                doc.text(`Dashboard for: ${workbook.fileName} - ${activeSheetName}`, 14, 16);
                
                if (chartCanvasRef.current) {
                    const chartImage = chartCanvasRef.current.toDataURL('image/png', 1.0);
                    doc.addImage(chartImage, 'PNG', 14, 24, 270, 100);
                }

                doc.addPage();
                doc.text('Processed Data Table', 14, 16);
                doc.autoTable({
                    head: [activeSheet.headers],
                    body: processedData.map(row => activeSheet.headers.map(h => row[h])),
                    startY: 24,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [22, 160, 133] }
                });

                doc.save(`${fileName}.pdf`);
            }
        } catch (e) {
            console.error("Export failed", e);
            setError("An error occurred during export.");
        } finally {
            setExporting(false);
        }
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
                        <CardHeader>
                            <CardTitle>Controls</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Sheet Selector */}
                            <div>
                                <label className="text-sm font-medium text-gray-300">Sheet</label>
                                <select value={activeSheetName} onChange={e => setActiveSheetName(e.target.value)} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white">
                                    {workbook.sheets.map(s => <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>)}
                                </select>
                            </div>
                            {/* Filters */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-200">Filters</h4>
                                {filters.map(f => (
                                    <div key={f.id} className="p-3 bg-white/5 rounded-lg space-y-2">
                                        <div className="flex justify-between items-center">
                                            <select value={f.column} onChange={e => updateFilter(f.id, 'column', e.target.value)} className="w-full p-2 border rounded-md bg-transparent border-white/20 text-white">
                                                {activeSheet?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            <button onClick={() => removeFilter(f.id)} className="ml-2 text-gray-400 hover:text-red-400"><XCircleIcon className="w-5 h-5"/></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <select value={f.operator} onChange={e => updateFilter(f.id, 'operator', e.target.value)} className="w-1/2 p-2 border rounded-md bg-transparent border-white/20 text-white">
                                                <option value="equals">Equals</option><option value="not_equals">Not Equals</option>
                                                <option value="contains">Contains</option><option value="not_contains">Not Contains</option>
                                                <option value="starts_with">Starts With</option><option value="ends_with">Ends With</option>
                                                <option value=">">&gt;</option><option value="<">&lt;</option>
                                                <option value=">=">&gt;=</option><option value="<=">&lt;=</option>
                                            </select>
                                            <input type="text" value={f.value} onChange={e => updateFilter(f.id, 'value', e.target.value)} placeholder="Value" className="w-1/2 p-2 border rounded-md bg-transparent border-white/20 text-white"/>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="secondary" onClick={addFilter}>Add Filter</Button>
                            </div>
                            {/* Sort */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-200">Sort</h4>
                                <div className="flex gap-2">
                                    <select value={sort?.column || ''} onChange={e => setSort(s => ({...s, column: e.target.value, direction: s?.direction || 'asc'}))} className="w-2/3 p-2 border rounded-md bg-transparent border-white/20 text-white">
                                        <option value="">-- No Sort --</option>
                                        {activeSheet?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <select value={sort?.direction || 'asc'} onChange={e => setSort(s => ({...s, direction: e.target.value as 'asc' | 'desc', column: s?.column || ''}))} disabled={!sort?.column} className="w-1/3 p-2 border rounded-md bg-transparent border-white/20 text-white">
                                        <option value="asc">Asc</option><option value="desc">Desc</option>
                                    </select>
                                </div>
                            </div>
                            {/* Visualization */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-200">Visualization</h4>
                                <div>
                                    <label className="text-xs text-gray-400">Chart Type</label>
                                    <select value={chartConfig.type} onChange={e => setChartConfig(c => ({...c, type: e.target.value as ChartType}))} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white">
                                        <option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option>
                                    </select>
                                </div>
                                 <div>
                                    <label className="text-xs text-gray-400">X-Axis (Category)</label>
                                    <select value={chartConfig.xAxisColumn} onChange={e => setChartConfig(c => ({...c, xAxisColumn: e.target.value}))} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white">
                                        {activeSheet?.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400">Y-Axis (Value)</label>
                                    <select value={chartConfig.yAxisColumn} onChange={e => setChartConfig(c => ({...c, yAxisColumn: e.target.value}))} className="w-full p-2 mt-1 border rounded-md bg-transparent border-white/20 text-white">
                                        {numericColumns.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Dashboard Display --- */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Dashboard</CardTitle>
                                <CardDescription>Showing {processedData.length} of {activeSheet?.data.length} rows</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={exporting}>
                                    {exporting ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <DownloadIcon className="w-4 h-4 mr-2" />} PDF
                                </Button>
                                <Button variant="secondary" onClick={() => handleExport('csv')} disabled={exporting}>
                                    {exporting ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <DownloadIcon className="w-4 h-4 mr-2" />} CSV
                                </Button>
                                <Button onClick={() => handleExport('xlsx')} disabled={exporting}>
                                    {exporting ? <SpinnerIcon className="w-4 h-4 mr-2" /> : <DownloadIcon className="w-4 h-4 mr-2" />} XLSX
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-96 w-full"><canvas ref={chartCanvasRef}></canvas></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Table</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-auto">
                            <table className="min-w-full divide-y divide-white/10">
                                <thead className="sticky top-0 glass-card">
                                    <tr>{activeSheet?.headers.map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{h}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {processedData.slice(0, 100).map((row, i) => (
                                        <tr key={i} className="hover:bg-white/5">
                                            {activeSheet?.headers.map(h => <td key={h} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 truncate max-w-xs" title={String(row[h] ?? '')}>{String(row[h] ?? '')}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {processedData.length > 100 && <p className="text-center text-sm text-gray-400 py-4">Showing first 100 rows. Export to see all data.</p>}
                             {processedData.length === 0 && <p className="text-center text-gray-500 py-10">No data matches the current filters.</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DashboardTool;
