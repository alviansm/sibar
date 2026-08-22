'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FolderTree, Settings, Edit3, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { SidebarOutlineTree } from './SidebarOutlineTree';

interface ProjectSidebarProps {
  project: {
    id?: string;
    name: string;
    slug: string;
    status: string;
    category?: string | null;
    reference_material?: string | null;
  };
  chapters: any[];
  subchapters: any[];
  activeSubId?: string;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  project,
  chapters,
  subchapters,
  activeSubId,
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const activeSubchapter = subchapters.find((s) => s.id === activeSubId);

  return (
    <>
      {/* ── Mobile Outline Drawer Bar (< md) ────────────────────────────────── */}
      <div className="md:hidden w-full bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="p-4 space-y-3">
          {/* Project Info Header Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                  {project.status}
                </span>
                {project.category && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {project.category}
                  </span>
                )}
                {project.reference_material && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                    {project.reference_material}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {project.name}
              </h2>
            </div>

            {/* Quick Settings Link */}
            <Link
              href={`/projects/${project.slug}/settings`}
              title="Project Settings"
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>

          {/* Toggle Button for Syllabus Taxonomy */}
          <button
            type="button"
            onClick={() => setIsMobileExpanded((prev) => !prev)}
            className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all border ${
              isMobileExpanded
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FolderTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span className="font-bold">Syllabus Outline</span>
              {activeSubchapter && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                  ({activeSubchapter.code} {activeSubchapter.title})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
              <span className="text-[11px] font-mono">{chapters.length} Ch</span>
              {isMobileExpanded ? (
                <ChevronUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>
        </div>

        {/* Collapsible Mobile Content Container */}
        {isMobileExpanded && (
          <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Chapters &amp; Subchapters</span>
              </span>
              <Link
                href={`/projects/${project.slug}/settings`}
                onClick={() => setIsMobileExpanded(false)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Taxonomy</span>
              </Link>
            </div>

            {/* Tree */}
            <div className="max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              <SidebarOutlineTree
                chapters={chapters}
                subchapters={subchapters}
                activeSubId={activeSubId}
                slug={project.slug}
                onSelect={() => setIsMobileExpanded(false)}
              />
            </div>

            {/* Mobile Footer Link */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
              <Link
                href={`/projects/${project.slug}/settings`}
                onClick={() => setIsMobileExpanded(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 text-center hover:bg-slate-200 transition-colors"
              >
                Project Settings
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileExpanded(false)}
                className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-500 transition-colors"
              >
                Close Outline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop Sticky Sidebar (md+) ─────────────────────────────────────── */}
      <aside className="hidden md:flex w-80 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-6 flex-col justify-between flex-shrink-0 md:sticky md:top-0 md:h-screen md:max-h-screen overflow-hidden">
        {/* Project Header Summary (Fixed Top) */}
        <div className="space-y-2 pb-4 border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
              {project.status}
            </span>
            {project.category && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {project.category}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {project.name}
          </h2>
          {project.reference_material && (
            <p className="text-xs text-slate-500 line-clamp-2">
              {project.reference_material}
            </p>
          )}
        </div>


        {/* Scrollable Taxonomy Tree Container */}
        <div className="flex-1 overflow-y-auto my-4 pr-1.5 space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-20 py-1 border-b border-slate-100 dark:border-slate-800/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Syllabus Taxonomy</span>
            </span>
            <Link
              href={`/projects/${project.slug}/settings`}
              title="Edit Taxonomy Tree"
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Link>
          </div>

          <SidebarOutlineTree
            chapters={chapters}
            subchapters={subchapters}
            activeSubId={activeSubId}
            slug={project.slug}
          />
        </div>

        {/* Sidebar Footer Link (Fixed Bottom) */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex-shrink-0">
          <Link
            href={`/projects/${project.slug}/settings`}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Project &amp; Outline Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
};
