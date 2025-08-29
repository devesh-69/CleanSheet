import React from 'react';
import { SpinnerIcon } from './ui/Icons';

interface ProcessingIndicatorProps {
    title: string;
    description: string;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ title, description }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 glass-card rounded-lg shadow-md animate-slide-in">
        <SpinnerIcon className="w-12 h-12 text-blue-400 mb-4" />
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-gray-400 mt-2">{description}</p>
    </div>
);
