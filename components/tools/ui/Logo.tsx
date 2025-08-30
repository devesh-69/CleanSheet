import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32">
        <stop offset="0%" stopColor="#60a5fa" /> 
        <stop offset="100%" stopColor="#a78bfa" />
      </linearGradient>
    </defs>
    <path
      d="M20 2H8C6.89543 2 6 2.89543 6 4V22H18C19.1046 22 20 21.1046 20 20V2Z"
      fill="url(#logoGradient)"
      fillOpacity="0.6"
    />
    <path
      d="M24 10H12C10.8954 10 10 10.8954 10 12V30H22C23.1046 30 24 29.1046 24 28V10Z"
      fill="url(#logoGradient)"
    />
  </svg>
);
