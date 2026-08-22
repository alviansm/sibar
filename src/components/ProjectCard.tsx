'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Settings, BookOpen, Target, CheckCircle2, Layers } from 'lucide-react';
import { DEFAULT_WORKSPACE_THUMBNAIL } from '@/lib/constants';

export interface ProjectCardData {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  thumbnail_url?: string | null;
  reference_material: string;
  target_milestone: string;
  status: 'active' | 'paused' | 'completed';
  created_at: number;
  last_accessed_at?: number | null;
  totalSubchapters: number;
  masteredSubchapters: number;
  progressPct: number;
}

interface ProjectCardProps {
  project: ProjectCardData;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const thumbnailSrc = project.thumbnail_url || DEFAULT_WORKSPACE_THUMBNAIL;
  const categoryName = project.category || 'General';

  const getStatusBadge = () => {
    switch (project.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-md shadow-xs">
            <CheckCircle2 className="w-3 h-3" />
            <span>Mastered</span>
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/90 text-white backdrop-blur-md shadow-xs">
            <span>Paused</span>
          </span>
        );
      case 'active':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-600/90 text-white backdrop-blur-md shadow-xs">
            <span>In Training</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-m3-1 hover:shadow-m3-3 transition-all flex flex-col justify-between group hover:-translate-y-0.5 duration-200">
      <div>
        {/* Card Thumbnail Top Banner (Coursera / Udemy style) */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={thumbnailSrc}
            alt={project.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30 pointer-events-none" />

          {/* Floating Category Badge (Top Left) */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-slate-900/80 text-white backdrop-blur-md border border-white/20 shadow-sm">
              <span>{categoryName}</span>
            </span>
          </div>

          {/* Floating Status Badge (Top Right) */}
          <div className="absolute top-3 right-3">
            {getStatusBadge()}
          </div>

          {/* Percentage Circular Badge (Bottom Right) */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-white/20 text-white font-mono text-xs font-bold shadow-md">
            <span>{project.progressPct}%</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 tracking-tight">
              {project.name}
            </h3>
            
            <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              <p className="line-clamp-1 flex items-center gap-1.5 font-medium">
                <BookOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-400 font-normal">Ref:</span>
                <span className="truncate">{project.reference_material}</span>
              </p>
              <p className="line-clamp-1 flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-300">
                <Target className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span className="text-slate-400 font-normal">Goal:</span>
                <span className="truncate">{project.target_milestone}</span>
              </p>
            </div>
          </div>

          {/* Progress Bar & Subchapter count */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500 dark:text-slate-400">Subchapter Mastery</span>
              <span className="text-slate-800 dark:text-slate-200 font-mono">
                {project.masteredSubchapters} / {project.totalSubchapters}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  project.progressPct === 100
                    ? 'bg-emerald-500'
                    : 'bg-indigo-600 dark:bg-indigo-500'
                }`}
                style={{ width: `${project.progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 sm:px-6 pb-5 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          <span>Open Workspace</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
        <Link
          href={`/projects/${project.slug}/settings`}
          title="Taxonomy & Project Settings"
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
