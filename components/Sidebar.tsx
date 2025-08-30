import React from 'react';
import { Tool } from '../types';
import {
  LayoutGridIcon, CopyIcon, SparklesIcon, ReplaceIcon,
  CombineIcon, ColumnsIcon, PieChartIcon, CheckSquareIcon, FileTextIcon, BarChartIcon
} from './ui/Icons';
import { Logo } from './ui/Logo';

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
      className={`relative flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${
        isActive
          ? 'bg-blue-600/20 text-white shadow-lg'
          : 'text-gray-300 hover:bg-white/10'
      }`}
    >
      {isActive && <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-400 to-purple-500 rounded-r-full"></div>}
      {icon}
      <span className="ml-4">{label}</span>
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300" 
           style={{background: 'radial-gradient(circle at center, rgba(255,255,255,0.3), transparent)'}}></div>
    </a>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTool, setActiveTool }) => {
  return (
    <div className="hidden md:flex flex-col w-72 glass-sidebar flex-shrink-0">
      <div className="flex items-center justify-center h-20 border-b border-white/10">
        <Logo className="w-8 h-8 mr-3" />
        <span className="text-white font-bold text-xl tracking-wider">Duplisheets</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Core Tools</h3>
          <nav className="space-y-2">
            <NavLink icon={<CopyIcon className="w-5 h-5" />} label="Single File Duplicates" tool={Tool.SINGLE_FILE_DUPLICATES} activeTool={activeTool} onClick={setActiveTool} />
            <NavLink icon={<SparklesIcon className="w-5 h-5" />} label="Special Characters" tool={Tool.SPECIAL_CHARS} activeTool={activeTool} onClick={setActiveTool} />
            <NavLink icon={<ReplaceIcon className="w-5 h-5" />} label="Find & Replace" tool={Tool.FIND_REPLACE} activeTool={activeTool} onClick={setActiveTool} />
          </nav>
        </div>
        <div>
           <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Advanced Tools</h3>
           <nav className="space-y-2">
            <NavLink icon={<LayoutGridIcon className="w-5 h-5" />} label="Find Unique Rows" tool={Tool.FIND_UNIQUE_ROWS} activeTool={activeTool} onClick={setActiveTool} />
            <NavLink icon={<CombineIcon className="w-5 h-5" />} label="Merge Multiple Files" tool={Tool.MERGE_FILES} activeTool={activeTool} onClick={setActiveTool} />
            <NavLink icon={<ColumnsIcon className="w-5 h-5" />} label="Compare Columns" tool={Tool.COMPARE_COLUMNS} activeTool={activeTool} onClick={setActiveTool} />
            <NavLink icon={<PieChartIcon className="w-5 h-5" />} label="Quick Summary" tool={Tool.QUICK_SUMMARY} activeTool={activeTool} onClick={setActiveTool} />
            <NavLink icon={<CheckSquareIcon className="w-5 h-5" />} label="Data Validation" tool={Tool.DATA_VALIDATION} activeTool={activeTool} onClick={setActiveTool} />
            <NavLink icon={<FileTextIcon className="w-5 h-5" />} label="Export Duplicates" tool={Tool.EXPORT_DUPLICATES} activeTool={activeTool} onClick={setActiveTool} />
            <NavLink icon={<BarChartIcon className="w-5 h-5" />} label="Interactive Dashboard" tool={Tool.DASHBOARD_BUILDER} activeTool={activeTool} onClick={setActiveTool} />
          </nav>
        </div>
      </div>
       <div className="p-4 border-t border-white/10 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} Duplisheets</p>
      </div>
    </div>
  );
};