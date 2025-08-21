import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { SparklesIcon } from '../ui/Icons';

interface PlaceholderToolProps {
  title: string;
  description?: string;
}

const PlaceholderTool: React.FC<PlaceholderToolProps> = ({ title, description }) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
       <header className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-white">{title}</h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
          {description || 'This feature is coming soon. Stay tuned!'}
        </p>
      </header>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center p-16 border-2 border-dashed border-gray-300 rounded-lg">
              <SparklesIcon className="w-16 h-16 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Under Construction</h3>
              <p className="text-gray-500 mt-2">We're working hard to bring this tool to you.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderTool;
