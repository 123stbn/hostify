import React from 'react';

interface HostifyLogoProps {
  size?: number;
  className?: string;
}

/**
 * Hostify Official Brand Logo (Clean)
 * Extracted from Stitch project 15311463371412801107 (Screen: Hostify Brand Logo (Clean))
 * Features clean vector squircle, sonic waveform gradient, and sharp terminal dot without bounding-box glow artifacts.
 */
export const HostifyLogo: React.FC<HostifyLogoProps> = ({ 
  size = 28, 
  className = ''
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Hostify Logo"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="hostifyGrad" x1="10" y1="10" x2="110" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      {/* Background squircle */}
      <rect x="12" y="12" width="96" height="96" rx="24" fill="#111722" stroke="#1E293B" strokeWidth="2" />
      {/* Minimalist audio waves meeting server stack */}
      <path 
        d="M34 60C34 50 42 42 52 42C62 42 70 50 70 60C70 70 78 78 88 78" 
        stroke="url(#hostifyGrad)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Soundwave vertical bars */}
      <line x1="42" y1="48" x2="42" y2="72" stroke="#06B6D4" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="52" y1="36" x2="52" y2="84" stroke="url(#hostifyGrad)" strokeWidth="5" strokeLinecap="round" />
      <line x1="62" y1="44" x2="62" y2="76" stroke="#3B82F6" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="72" y1="52" x2="72" y2="68" stroke="#10B981" strokeWidth="4" strokeLinecap="round" />
      {/* Clean terminal circle without bounding box / square halo */}
      <circle cx="88" cy="78" r="4.5" fill="#10B981" />
    </svg>
  );
};
