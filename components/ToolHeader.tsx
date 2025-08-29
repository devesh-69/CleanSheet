import React from 'react';

interface ToolHeaderProps {
    title: string;
    description: string;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({ title, description }) => (
    <header className="text-center animate-slide-in">
        <h1 className="text-5xl font-extrabold tracking-tight gradient-text">{title}</h1>
        <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            {description}
        </p>
    </header>
);
