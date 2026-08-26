import React from 'react';

export default function Logo({ className = "w-10 h-10" }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#3525cd" />
        </linearGradient>
      </defs>
      {/* Wallet/Coin Motif combined with Graduation Cap */}
      <rect x="15" y="35" width="70" height="45" rx="8" fill="url(#logoGrad)" />
      {/* Flap of the wallet / Graduation Cap top */}
      <path d="M50 15 L90 35 L50 45 L10 35 Z" fill="url(#logoGrad)" opacity="0.9"/>
      {/* Tassel */}
      <path d="M50 45 L50 65" stroke="#10b981" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="50" cy="65" r="4" fill="#10b981"/>
      {/* Coin slot */}
      <rect x="35" y="50" width="30" height="4" rx="2" fill="white" opacity="0.6"/>
      {/* Coin popping out */}
      <circle cx="50" cy="40" r="10" fill="#10b981" />
      <circle cx="50" cy="40" r="6" fill="white" opacity="0.3"/>
    </svg>
  );
}
