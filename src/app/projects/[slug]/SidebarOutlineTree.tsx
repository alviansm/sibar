'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

interface SidebarOutlineTreeProps {
  chapters: any[];
  subchapters: any[];
  activeSubId?: string;
  slug: string;
}

export const SidebarOutlineTree: React.FC<SidebarOutlineTreeProps> = ({
  chapters,
  subchapters,
  activeSubId,
  slug,
}) => {
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() => {
    const state: Record<string, boolean> = {};
    chapters.forEach((ch) => {
      state[ch.id] = true; // open all by default
    });
    return state;
  });

  const toggleChapter = (chId: string) => {
    setOpenChapters((prev) => ({ ...prev, [chId]: !prev[chId] }));
  };

  // Calculate overall progress across all subchapters
  const totalItems = subchapters.reduce((acc, s) => acc + (s.totalItems || 0), 0);
  const completedItems = subchapters.reduce((acc, s) => acc + (s.completedItems || 0), 0);

  let overallProgress = 0;
  if (totalItems > 0) {
    overallProgress = Math.round((completedItems / totalItems) * 100);
  } else if (subchapters.length > 0) {
    const mastered = subchapters.filter((s) => s.status === 'mastered').length;
    overallProgress = Math.round((mastered / subchapters.length) * 100);
  }

  return (
    <div className="space-y-3">
      {/* Syllabus Taxonomy Overall Progress Bar */}
      <div className="relative group/progressbar p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 transition-all">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Syllabus Progress
          </span>
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {overallProgress}%
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="relative w-full h-2.5 bg-slate-200/80 dark:bg-slate-700/60 rounded-full overflow-hidden cursor-pointer">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-full transition-all duration-500 relative"
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        {/* Hover Percentage Badge Floating On Top of Progress Bar */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/progressbar:opacity-100 transition-all duration-200 pointer-events-none z-30 transform group-hover/progressbar:-translate-y-0.5">
          <div className="bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg shadow-lg border border-slate-700/80 flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>{overallProgress}% Completed</span>
          </div>
          <div className="w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700/80" />
        </div>
      </div>

      {/* Chapters Tree */}
      <div className="space-y-2">
        {chapters.map((ch) => {
          const children = subchapters.filter((s) => s.parent_id === ch.id);
          const isOpen = openChapters[ch.id] !== false; // Default open unless explicitly collapsed

          return (
            <div key={ch.id} className="space-y-1">
              {/* Chapter Node */}
              <button
                onClick={() => toggleChapter(ch.id)}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-indigo-600 dark:text-indigo-400">{ch.code}</span>
                  <span className="font-sans font-semibold text-slate-900 dark:text-white">{ch.title}</span>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Subchapters List */}
              {isOpen && (
                <div className="pl-4 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-3">
                  {children.map((sub) => {
                    const isActive = sub.id === activeSubId;
                    const subPct = Math.round(sub.progressPercentage || 0);

                    return (
                      <Link
                        key={sub.id}
                        href={`/projects/${slug}?sub=${sub.id}`}
                        className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-bold shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-400 font-semibold">{sub.code}</span>
                          <span className="truncate max-w-[140px]">{sub.title}</span>
                        </div>

                        {/* Circular Progress Ring indicator with Hover Percentage Tooltip */}
                        {subPct >= 100 ? (
                          <div className="relative group/subring flex items-center justify-center flex-shrink-0" title={`${subPct}% Completed`}>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <div className="absolute -top-7 right-0 opacity-0 group-hover/subring:opacity-100 transition-all duration-200 pointer-events-none z-30">
                              <div className="bg-slate-900 dark:bg-slate-800 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-md border border-slate-700 whitespace-nowrap">
                                100%
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="relative group/subring flex items-center justify-center flex-shrink-0" title={`${subPct}% Completed`}>
                            <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
                              <circle
                                cx="8"
                                cy="8"
                                r="6"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                className="text-slate-200 dark:text-slate-700"
                              />
                              {subPct > 0 && (
                                <circle
                                  cx="8"
                                  cy="8"
                                  r="6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  fill="none"
                                  strokeDasharray={37.7}
                                  strokeDashoffset={37.7 - (subPct / 100) * 37.7}
                                  strokeLinecap="round"
                                  className="text-indigo-600 dark:text-indigo-400 transition-all duration-300"
                                />
                              )}
                            </svg>
                            <div className="absolute -top-7 right-0 opacity-0 group-hover/subring:opacity-100 transition-all duration-200 pointer-events-none z-30">
                              <div className="bg-slate-900 dark:bg-slate-800 text-indigo-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-md border border-slate-700 whitespace-nowrap">
                                {subPct}%
                              </div>
                            </div>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

