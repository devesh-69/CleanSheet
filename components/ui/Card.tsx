
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`glass-card rounded-lg shadow-2xl ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => {
    return <div className={`p-6 border-b border-white/10 ${className}`}>{children}</div>
};

// FIX: Update CardContent to accept a ref by using React.forwardRef.
// This allows parent components to get a reference to the underlying div,
// which is needed for functionality like PDF exporting in DataStorytellingTool.
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={`p-6 ${className}`} {...props}>
    {children}
  </div>
));
CardContent.displayName = "CardContent";

interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => {
    return <div className={`p-6 border-t border-white/10 ${className}`}>{children}</div>
};

interface CardTitleProps {
    children: React.ReactNode;
    className?: string;
}

export const CardTitle: React.FC<CardTitleProps> = ({ children, className }) => {
    return <h3 className={`text-2xl font-bold leading-none tracking-tight text-white ${className}`}>{children}</h3>
};

interface CardDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({ children, className }) => {
    return <p className={`text-sm text-gray-400 ${className}`}>{children}</p>
};
