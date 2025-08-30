import React, { useState } from 'react';
import { HelpCircleIcon } from './Icons';

interface InfoProps {
  text: string;
}

export const Info: React.FC<InfoProps> = ({ text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <button 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-gray-400 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label="More info"
      >
        <HelpCircleIcon className="w-4 h-4" />
      </button>
      {show && (
        <div 
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 border border-white/20 text-white text-xs rounded-lg shadow-lg z-10"
            role="tooltip"
        >
          {text}
        </div>
      )}
    </div>
  );
};
