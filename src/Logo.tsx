import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      className={className}
      aria-label="Money Notes Logo"
    >
      <defs>
        <linearGradient id="grad_logo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="1" />
          <stop offset="100%" stopColor="#14532d" stopOpacity="1" />
        </linearGradient>
        <filter id="shadow_logo" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity="0.2"/>
        </filter>
      </defs>
      
      {/* Background: Rounded Square */}
      <rect x="0" y="0" width="512" height="512" rx="110" fill="url(#grad_logo)" />
      
      {/* Notebook Base */}
      <rect x="106" y="106" width="300" height="340" rx="20" fill="#f1f5f9" filter="url(#shadow_logo)" />
      
      {/* Notebook Cover/Top Strip */}
      <path d="M106 106 h300 a20 20 0 0 1 20 20 v40 h-340 v-40 a20 20 0 0 1 20 -20 z" fill="#e2e8f0" />
      
      {/* Binding Rings */}
      <circle cx="146" cy="116" r="8" fill="#cbd5e1" />
      <circle cx="186" cy="116" r="8" fill="#cbd5e1" />
      <circle cx="226" cy="116" r="8" fill="#cbd5e1" />
      <circle cx="266" cy="116" r="8" fill="#cbd5e1" />
      <circle cx="306" cy="116" r="8" fill="#cbd5e1" />
      <circle cx="346" cy="116" r="8" fill="#cbd5e1" />
      <circle cx="386" cy="116" r="8" fill="#cbd5e1" />

      {/* Lines */}
      <line x1="146" y1="200" x2="366" y2="200" stroke="#cbd5e1" strokeWidth="16" strokeLinecap="round" />
      <line x1="146" y1="250" x2="366" y2="250" stroke="#cbd5e1" strokeWidth="16" strokeLinecap="round" />
      <line x1="146" y1="300" x2="366" y2="300" stroke="#cbd5e1" strokeWidth="16" strokeLinecap="round" />
      
      {/* Gold Coin */}
      <circle cx="356" cy="356" r="70" fill="#eab308" stroke="#ffffff" strokeWidth="8" filter="url(#shadow_logo)" />
      <circle cx="356" cy="356" r="55" fill="none" stroke="#facc15" strokeWidth="4" strokeDasharray="10 5"/>
      
      {/* Dollar Sign */}
      <text x="356" y="385" fontFamily="sans-serif" fontSize="80" fontWeight="bold" textAnchor="middle" fill="#ffffff">$</text>
    </svg>
  );
};

export default Logo;