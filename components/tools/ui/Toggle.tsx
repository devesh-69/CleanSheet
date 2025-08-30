import React from 'react';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // FIX: Add optional disabled prop to allow disabling the toggle.
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ id, checked, onChange, disabled = false }) => (
    <label htmlFor={id} className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        <input type="checkbox" id={id} className="sr-only peer" checked={checked} onChange={onChange} disabled={disabled} />
        <div className="w-11 h-6 bg-gray-200/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r from-blue-500 to-purple-600"></div>
    </label>
);
