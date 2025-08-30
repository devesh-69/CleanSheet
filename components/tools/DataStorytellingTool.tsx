import React, { useState, useRef } from 'react';
import { ParsedFile, AppStep, DataStory } from '../../types';
import { FileUploader } from '../FileUploader';
import { ToolHeader } from '../ToolHeader';
import { ProcessingIndicator } from '../ProcessingIndicator';
import { generateDataStory } from '../../services/aiAnalyzer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { DownloadIcon } from '../ui/Icons';

declare const Chart: any;
declare const jspdf: any;

const CHART_COLORS = [
    'rgba(59, 130, 246, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 
    'rgba(239, 68, 68, 0.7)', 'rgba(249, 115, 22, 0.7)', 'rgba(245, 158, 11, 0.7)', 
    'rgba(236, 72, 153, 0.7)', 'rgba(99, 102, 241, 0.7)'
];

const StoryChart: React.FC<{ chartData: DataStory['sections'][0]['chart'] }> = ({ chartData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);

    React.useEffect(() => {
        if (!canvasRef.current || !chartData) return;
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const chartConfigData = {
            ...chartData.data,
            datasets: chartData.data.datasets.map(ds => ({
                ...ds,
                backgroundColor: chartData.type === 'pie' ? CHART_COLORS.slice(0, ds.data.length) : CHART_COLORS[0],
                borderColor: CHART_COLORS.map(c => c.replace('0.7', '1'))[0],
                borderWidth: 1,
            }))
        };
        
        chartInstanceRef.current = new Chart(ctx, {
            type: chartData.type,
            data: chartConfigData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: chartData.type !== 'pie' && chartData.data.datasets.length > 1, labels: { color: '#d1d5db' } } },
                scales: chartData.type !== 'pie' ? {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.1)' } }
                } : undefined
            }
        });

        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); };
    }, [chartData]);
    
    return <canvas ref={canvasRef}></canvas>;
};


const DataStorytellingTool: React.FC = () => {
    const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
    const [file, setFile] = useState<ParsedFile | null>(null);
    const [story, setStory] = useState<DataStory | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reportRef = useRef<HTMLDivElement>(null);

    const handleFileUpload = async (uploadedFile: ParsedFile | null, uploadError: string | null) => {
        if (uploadError) {
            setError(uploadError);
            return;
        }
        if (uploadedFile) {
            setFile(uploadedFile);
            setStep(AppStep.PROCESSING);
            setError(null);
            try {
                const generatedStory = await generateDataStory(uploadedFile);
                setStory(generatedStory);
                setStep(AppStep.RESULTS);
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred while generating the story.');
                setStep(AppStep.UPLOAD);
            }
        }
    };

    const handleRestart = () => {
        setStep(AppStep.UPLOAD);
        setFile(null);
        setStory(null);
        setError(null);
    };

    const handleExportPdf = () => {
        if (!reportRef.current || !story) return;

        const doc = new jspdf.jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        const content = reportRef.current;
        const margin = 40;
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = margin;

        const addText = (text: string, options: any) => {
            const lines = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - margin * 2);
            lines.forEach((line: string) => {
                if (yPos > pageHeight - margin) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(line, margin, yPos);
                yPos += (options.fontSize || 12) * 1.2;
            });
        };

        doc.setFontSize(22).setFont(undefined, 'bold');
        addText(`Data Story for: ${file?.name}`, { fontSize: 22 });
        yPos += 10;

        doc.setFontSize(16).setFont(undefined, 'bold');
        addText('Executive Summary', { fontSize: 16 });
        doc.setFontSize(11).setFont(undefined, 'normal');
        addText(story.executiveSummary, { fontSize: 11 });
        yPos += 20;

        const charts = content.querySelectorAll('canvas');
        story.sections.forEach((section, index) => {
            if (yPos > pageHeight - 300) { // Check if space for header + chart
                doc.addPage();
                yPos = margin;
            }
            doc.setFontSize(16).setFont(undefined, 'bold');
            addText(section.title, { fontSize: 16 });
            yPos += 5;
            doc.setFontSize(11).setFont(undefined, 'normal');
            addText(section.insight, { fontSize: 11 });
            yPos += 10;
            
            const chartCanvas = charts[index];
            if (chartCanvas) {
                const imgData = chartCanvas.toDataURL('image/png', 1.0);
                const imgWidth = doc.internal.pageSize.getWidth() - margin * 2;
                const imgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
                doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
                yPos += imgHeight + 20;
            }
        });

        doc.save(`${file?.name.split('.')[0]}_story.pdf`);
    };

    const renderContent = () => {
        switch (step) {
            case AppStep.UPLOAD:
                return (
                    <div>
                        <FileUploader
                            id="story-file"
                            title="Upload File"
                            description="Upload a spreadsheet to automatically generate a data story."
                            onFileUpload={handleFileUpload}
                        />
                        {error && (
                             <div className="mt-4 text-sm text-red-400 p-3 bg-red-500/10 rounded-lg text-center animate-slide-in">
                                {error}
                             </div>
                        )}
                    </div>
                );
            case AppStep.PROCESSING:
                return <ProcessingIndicator title="Generating Your Data Story..." description="The AI is analyzing your data. This may take a moment." />;
            case AppStep.RESULTS:
                if (story && file) {
                    return (
                        <div className="animate-slide-in">
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <CardTitle>Your Data Story is Ready</CardTitle>
                                        <CardDescription>AI-powered insights from {file.name}</CardDescription>
                                    </div>
                                    <Button onClick={handleExportPdf}>
                                        <DownloadIcon className="w-4 h-4 mr-2" />
                                        Export as PDF
                                    </Button>
                                </CardHeader>
                                <CardContent ref={reportRef} className="space-y-8">
                                    <div className="p-6 bg-white/5 rounded-lg border border-white/10">
                                        <h2 className="text-2xl font-bold gradient-text mb-2">Executive Summary</h2>
                                        <p className="text-gray-300">{story.executiveSummary}</p>
                                    </div>
                                    {story.sections.map((section, index) => (
                                        <div key={index} className="p-6 bg-white/5 rounded-lg border border-white/10">
                                            <h3 className="text-xl font-semibold text-white mb-2">{section.title}</h3>
                                            <p className="text-gray-400 mb-4">{section.insight}</p>
                                            <div className="h-80 w-full">
                                                {section.chart && <StoryChart chartData={section.chart} />}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button variant="secondary" onClick={handleRestart}>Start Over</Button>
                                </CardFooter>
                            </Card>
                        </div>
                    );
                }
                return null;
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8">
            <ToolHeader
                title="Data Storytelling & Insights"
                description="Let AI analyze your spreadsheet and automatically generate a narrative report with key findings and visualizations."
            />
            {renderContent()}
        </div>
    );
};

export default DataStorytellingTool;