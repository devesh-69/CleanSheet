import React from 'react';
import { Tool } from '../types';
import {
  LayoutGridIcon, CopyIcon, SparklesIcon, ReplaceIcon,
  CombineIcon, ColumnsIcon, PieChartIcon, CheckSquareIcon, FileTextIcon
} from './ui/Icons';

interface SidebarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
}

interface NavLinkProps {
  icon: React.ReactNode;
  label: string;
  tool: Tool;
  activeTool: Tool;
  onClick: (tool: Tool) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ icon, label, tool, activeTool, onClick }) => {
  const isActive = activeTool === tool;
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); onClick(tool); }}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
        isActive
          ? 'bg-gray-700 text-white'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </a>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTool, setActiveTool }) => {
  return (
    <div className="hidden md:flex flex-col w-64 bg-primary text-primary-foreground">
      <div className="flex items-center justify-center h-16 border-b border-gray-700">
        <SparklesIcon className="w-6 h-6 mr-2 text-blue-400" />
        <span className="text-white font-bold text-lg">Excel Pro Tools</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <nav className="space-y-2">
          <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Core Tools</h3>
          <NavLink icon={<CopyIcon className="w-5 h-5" />} label="Single File Duplicates" tool={Tool.SINGLE_FILE_DUPLICATES} activeTool={activeTool} onClick={setActiveTool} />
          <NavLink icon={<SparklesIcon className="w-5 h-5" />} label="Special Characters" tool={Tool.SPECIAL_CHARS} activeTool={activeTool} onClick={setActiveTool} />
          <NavLink icon={<ReplaceIcon className="w-5 h-5" />} label="Find & Replace" tool={Tool.FIND_REPLACE} activeTool={activeTool} onClick={setActiveTool} />
        </nav>
        <nav className="space-y-2">
           <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Advanced Tools</h3>
          <NavLink icon={<LayoutGridIcon className="w-5 h-5" />} label="Compare Two Files" tool={Tool.COMPARE_FILES} activeTool={activeTool} onClick={setActiveTool} />
          <NavLink icon={<CombineIcon className="w-5 h-5" />} label="Merge Multiple Files" tool={Tool.MERGE_FILES} activeTool={activeTool} onClick={setActiveTool} />
          <NavLink icon={<ColumnsIcon className="w-5 h-5" />} label="Compare Columns" tool={Tool.COMPARE_COLUMNS} activeTool={activeTool} onClick={setActiveTool} />
          <NavLink icon={<PieChartIcon className="w-5 h-5" />} label="Quick Summary" tool={Tool.QUICK_SUMMARY} activeTool={activeTool} onClick={setActiveTool} />
          <NavLink icon={<CheckSquareIcon className="w-5 h-5" />} label="Data Validation" tool={Tool.DATA_VALIDATION} activeTool={activeTool} onClick={setActiveTool} />
          <NavLink icon={<FileTextIcon className="w-5 h-5" />} label="Export Duplicates" tool={Tool.EXPORT_DUPLICATES} activeTool={activeTool} onClick={setActiveTool} />
        </nav>
      </div>
       <div className="p-4 border-t border-gray-700 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} Excel Pro Tools</p>
      </div>
    </div>
  );
};
