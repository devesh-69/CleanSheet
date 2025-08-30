
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
// FIX: Import the new DataStorytellingTool component to integrate it into the application.
import DataStorytellingTool from './components/tools/DataStorytellingTool';


const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.FIND_UNIQUE_ROWS);
  
  // By rendering all tools and using CSS to hide/show them, we preserve the state
  // of each tool component when the user switches between them.
  const toolComponents: Record<string, React.ReactNode> = {
    [Tool.FIND_UNIQUE_ROWS]: <CompareFilesTool />,
    [Tool.SINGLE_FILE_DUPLICATES]: <SingleFileDuplicateRemover />,
    [Tool.SPECIAL_CHARS]: <SpecialCharsTool />,
    [Tool.FIND_REPLACE]: <FindReplaceTool />,
    [Tool.MERGE_FILES]: <MergeFilesTool />,
    [Tool.COMPARE_COLUMNS]: <CompareColumnsTool />,
    [Tool.QUICK_SUMMARY]: <QuickSummaryTool />,
    [Tool.DATA_VALIDATION]: <DataValidationTool />,
    [Tool.EXPORT_DUPLICATES]: <ExportDuplicatesTool />,
    [Tool.DASHBOARD_BUILDER]: <DashboardTool />,
    // FIX: Add the DataStorytellingTool to the map of available tools.
    [Tool.DATA_STORYTELLING]: <DataStorytellingTool />,
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar activeTool={activeTool} setActiveTool={setActiveTool} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            {Object.entries(toolComponents).map(([tool, component]) => (
              <div key={tool} className={activeTool === tool ? '' : 'hidden'}>
                {component}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
