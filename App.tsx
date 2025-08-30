import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Tool } from './types';
import CompareFilesTool from './components/tools/CompareFilesTool';
import SingleFileDuplicateRemover from './components/tools/SingleFileDuplicateRemover';
import SpecialCharsTool from './components/tools/SpecialCharsTool';
import FindReplaceTool from './components/tools/FindReplaceTool';
import MergeFilesTool from './components/tools/MergeFilesTool';
import CompareColumnsTool from './components/tools/CompareColumnsTool';
import QuickSummaryTool from './components/tools/QuickSummaryTool';
import DataValidationTool from './components/tools/DataValidationTool';
import ExportDuplicatesTool from './components/tools/ExportDuplicatesTool';
import DashboardTool from './components/tools/DashboardTool';


const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.FIND_UNIQUE_ROWS);

  const renderActiveTool = () => {
    switch (activeTool) {
      case Tool.FIND_UNIQUE_ROWS:
        return <CompareFilesTool />;
      case Tool.SINGLE_FILE_DUPLICATES:
        return <SingleFileDuplicateRemover />;
      case Tool.SPECIAL_CHARS:
        return <SpecialCharsTool />;
      case Tool.FIND_REPLACE:
        return <FindReplaceTool />;
      case Tool.MERGE_FILES:
        return <MergeFilesTool />;
      case Tool.COMPARE_COLUMNS:
        return <CompareColumnsTool />;
      case Tool.QUICK_SUMMARY:
        return <QuickSummaryTool />;
      case Tool.DATA_VALIDATION:
        return <DataValidationTool />;
      case Tool.EXPORT_DUPLICATES:
        return <ExportDuplicatesTool />;
      case Tool.DASHBOARD_BUILDER:
        return <DashboardTool />;
      default:
        return <CompareFilesTool />;
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            {renderActiveTool()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;