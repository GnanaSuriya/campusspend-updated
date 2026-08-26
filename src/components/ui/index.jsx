import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function GlassCard({ children, className, ...props }) {
  return (
    <div 
      className={cn("glass rounded-3xl p-6", className)} 
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassButton({ children, className, variant = 'primary', ...props }) {
  const baseStyles = "px-4 py-2 rounded-xl font-medium transition-all duration-300 active:scale-95 shadow-md flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-primary-600/90 text-white backdrop-blur hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-500/20",
    secondary: "bg-white/50 text-slate-700 backdrop-blur border border-white/60 hover:bg-white/70",
    danger: "bg-red-500/90 text-white backdrop-blur hover:bg-red-600"
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function GlassInput({ className, ...props }) {
  return (
    <input 
      className={cn("w-full px-4 py-3 rounded-xl glass-input text-slate-800 placeholder-slate-400", className)}
      {...props}
    />
  );
}

export function GlassModal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-in fade-in zoom-in duration-200">
        <GlassCard className="p-8">
          {title && <h2 className="text-2xl font-extrabold text-slate-800 mb-6">{title}</h2>}
          {children}
        </GlassCard>
      </div>
    </div>
  );
}
