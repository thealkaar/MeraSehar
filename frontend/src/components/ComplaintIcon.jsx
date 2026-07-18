import React from 'react';

export default function ComplaintIcon({ className = "w-6 h-6" }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {/* Redesigned complaints SVG: A sleek modern shield layout with a central report exclamation mark */}
      <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" />
      <line x1="12" y1="8" x2="12" y2="13" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
