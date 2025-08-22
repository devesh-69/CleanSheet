import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Tool } from './types';
import CompareFilesTool from './components/tools/CompareFilesTool';
import SingleFileDuplicateRemover from './components/tools/SingleFileDuplicateRemover';
import PlaceholderTool from './components/tools/PlaceholderTool';
import SpecialCharsTool from './components/tools/SpecialCharsTool';
import FindReplaceTool from './components/tools/FindReplaceTool';
import MergeFilesTool from './components/tools/MergeFilesTool';
import CompareColumnsTool from './components/tools/CompareColumnsTool';
import QuickSummaryTool from './components/tools/QuickSummaryTool';


const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.COMPARE_FILES);

  const renderActiveTool = () => {
    switch (activeTool) {
      case Tool.COMPARE_FILES:
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
        return <PlaceholderTool title="Data Validation Checks" />;
      case Tool.EXPORT_DUPLICATES:
        return <PlaceholderTool title="Export Duplicates as Report" />;
      default:
        return <CompareFilesTool />;
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
      <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-6 py-8">
            {renderActiveTool()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;