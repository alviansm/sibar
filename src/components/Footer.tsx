import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center p-1">
            <img src="/favicon.ico" alt="Sibar Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight">Sibar</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Sinau Bareng Archive</span>
          </div>
        </div>

        {/* Copyright Year (Non-interactive) */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-normal">
          <span>&copy; {currentYear} Sibar. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};
