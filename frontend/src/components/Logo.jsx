import React from 'react';

export default function Logo({ className = "w-10 h-10" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} shrink-0`}
      role="img"
      aria-label="MeraShehar"
    >
      <rect width="100" height="100" rx="28" fill="#050505" />
      <path
        d="M28 72V38L50 56L72 38V72"
        stroke="#FFFFFF"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M36 28H64" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="28" r="4" fill="#FFFFFF" />
    </svg>
  );
}
