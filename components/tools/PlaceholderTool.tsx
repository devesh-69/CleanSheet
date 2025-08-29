import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { SparklesIcon } from '../ui/Icons';
import { ToolHeader } from '../ToolHeader';

interface PlaceholderToolProps {
  title: string;
  description?: string;
}

const PlaceholderTool: React.FC<PlaceholderToolProps> = ({ title, description }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
       <ToolHeader 
        title={title} 
        description={description || 'This feature is coming soon. Stay tuned!'}
      />
      <Card className="animate-slide-in">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center p-16 border-2 border-dashed border-white/20 rounded-lg bg-white/5">
              <SparklesIcon className="w-16 h-16 text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-white">Under Construction</h3>
              <p className="text-gray-400 mt-2">We're working hard to bring this tool to you.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaceholderTool;
