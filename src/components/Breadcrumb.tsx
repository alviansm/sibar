'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, LayoutDashboard, Folder, BookOpen, Layers, Settings } from 'lucide-react';

export interface BreadcrumbSegment {
  label: string;
  href?: string;
  isCurrent?: boolean;
  code?: string;
  iconName?: 'dashboard' | 'project' | 'chapter' | 'exercise' | 'settings' | string;
}

interface BreadcrumbProps {
  items: BreadcrumbSegment[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  if (!items || items.length === 0) return null;

  const renderIcon = (iconName?: string, isFirst?: boolean) => {
    if (iconName === 'dashboard' || isFirst) {
      return <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />;
    }
    if (iconName === 'project') {
      return <Folder className="w-3.5 h-3.5 flex-shrink-0" />;
    }
    if (iconName === 'chapter') {
      return <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />;
    }
    if (iconName === 'exercise') {
      return <Layers className="w-3.5 h-3.5 flex-shrink-0" />;
    }
    if (iconName === 'settings') {
      return <Settings className="w-3.5 h-3.5 flex-shrink-0" />;
    }
    return null;
  };

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`flex items-center overflow-x-auto py-1 text-xs font-medium text-slate-500 dark:text-slate-400 no-scrollbar ${className}`}
    >
      <ol className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrent;
          const icon = renderIcon(item.iconName, index === 0);

          return (
            <li key={index} className="flex items-center gap-1.5 flex-shrink-0">
              {index > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast || !item.href ? (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/60 max-w-[220px] sm:max-w-[320px] shadow-2xs"
                  aria-current="page"
                >
                  {icon}
                  {item.code && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200 font-bold border border-indigo-200/50 dark:border-indigo-700/50">
                      {item.code}
                    </span>
                  )}
                  <span className="truncate" title={item.label}>
                    {item.label}
                  </span>
                </div>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all max-w-[180px] sm:max-w-[260px] group"
                >
                  {icon}
                  {item.code && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/50 font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors">
                      {item.code}
                    </span>
                  )}
                  <span className="truncate group-hover:underline" title={item.label}>
                    {item.label}
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
