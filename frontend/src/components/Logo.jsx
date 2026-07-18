import React from 'react';

export default function Logo({ className = "w-10 h-10" }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`${className} text-black dark:text-white transition-all duration-300`}
    >
      {/* Premium rounded outer box */}
      <rect width="100" height="100" rx="28" fill="currentColor" />
      {/* High-end minimalist line work representing city towers and "MS" structure */}
      <path 
        d="M28 72V38L50 56L72 38V72" 
        stroke="var(--bg-app)" 
        strokeWidth="9" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M36 28H64" 
        stroke="var(--bg-app)" 
        strokeWidth="6" 
        strokeLinecap="round" 
      />
      <circle 
        cx="50" 
        cy="28" 
        r="4" 
        fill="var(--bg-app)" 
      />
    </svg>
  );
}
