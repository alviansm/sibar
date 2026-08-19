'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { MathRenderer } from '@/components/MathRenderer';
import { toggleConceptStatusAction } from '@/app/actions/projects';
import { useToast } from '@/components/Toast';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Sparkles,
  Type,
  FileText,
  Share2,
} from 'lucide-react';

interface ConceptData {
  id: string;
  title: string;
  content: string;
  status: 'completed' | 'unread';
  examples?: Array<{
    id?: string;
    title?: string;
    statement?: string;
    problem_statement?: string;
    hint?: string;
    solution?: string;
    solution_guide?: string;
  }>;
}

interface ConceptDetailWorkspaceProps {
  outlineId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  parentChapter?: { id: string; code: string; title: string } | null;
  concept: ConceptData;
  conceptIndex: number;
  totalConceptsCount: number;
  prevConcept?: { id: string; title: string } | null;
  nextConcept?: { id: string; title: string } | null;
}

export const ConceptDetailWorkspace: React.FC<ConceptDetailWorkspaceProps> = ({
  outlineId,
  slug,
  projectTitle,
  subchapterCode,
  subchapterTitle,
  parentChapter,
  concept,
  conceptIndex,
  totalConceptsCount,
  prevConcept,
  nextConcept,
}) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<'completed' | 'unread'>(concept.status);
  const [isPending, setIsPending] = useState(false);
  const [copiedType, setCopiedType] = useState<'markdown' | 'text' | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [expandedExamples, setExpandedExamples] = useState<Record<string, boolean>>({});

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    childPage: concept.title,
  });

  const toggleExampleExpand = (key: string) => {
    setExpandedExamples((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleStatus = async () => {
    setIsPending(true);
    const res = await toggleConceptStatusAction(outlineId, concept.id);
    setIsPending(false);

    if (res.error) {
      toast('Error', res.error, 'error');
    } else {
      const newStatus = (res.newStatus as 'completed' | 'unread') || (status === 'completed' ? 'unread' : 'completed');
      setStatus(newStatus);
      const isCompleted = newStatus === 'completed';
      toast(
        isCompleted ? 'Marked as Completed' : 'Marked as Unread',
        isCompleted ? 'Subchapter progress updated.' : 'Concept reset to unread.',
        isCompleted ? 'success' : 'info'
      );
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const textToCopy = `# ${concept.title}\n\n${concept.content}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedType('markdown');
      toast('Copied to Clipboard', 'Full Markdown with LaTeX formulas copied.', 'success');
      setTimeout(() => setCopiedType(null), 2000);
    } catch (e) {
      toast('Copy Failed', 'Please select and copy manually.', 'error');
    }
  };

  const handleCopyPlainText = async () => {
    try {
      // Basic strip of latex delimiters and markdown formatting
      const plain = concept.content
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
        .replace(/\$([^\$]+)\$/g, '$1')
        .replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, '$1')
        .replace(/[#*`_~]/g, '');
      const textToCopy = `${concept.title}\n\n${plain.trim()}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopiedType('text');
      toast('Copied Plain Text', 'Plain readable text copied to clipboard.', 'success');
      setTimeout(() => setCopiedType(null), 2000);
    } catch (e) {
      toast('Copy Failed', 'Please select and copy manually.', 'error');
    }
  };

  const isCompleted = status === 'completed';
  const examples = concept.examples || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbs} />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${slug}?sub=${outlineId}`}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-xs"
            title="Back to Subchapter Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                <BookOpen className="w-3.5 h-3.5" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/40">
                CONCEPT {conceptIndex + 1} OF {totalConceptsCount}
              </span>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                  <HelpCircle className="w-3.5 h-3.5" /> Unread
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight break-words select-text">
              {concept.title}
            </h1>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          {/* Font Size Toggle */}
          <button
            type="button"
            onClick={() => setFontSize((prev) => (prev === 'normal' ? 'large' : 'normal'))}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              fontSize === 'large'
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title={`Toggle Font Size (Currently ${fontSize})`}
          >
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">{fontSize === 'large' ? 'Large Text' : 'Standard'}</span>
          </button>

          {/* Copy Markdown Button */}
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Copy Raw Markdown with LaTeX"
          >
            {copiedType === 'markdown' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedType === 'markdown' ? 'Copied!' : 'Copy LaTeX'}</span>
          </button>

          {/* Copy Plain Text Button */}
          <button
            type="button"
            onClick={handleCopyPlainText}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Copy Clean Plain Text"
          >
            {copiedType === 'text' ? <Check className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedType === 'text' ? 'Copied Text!' : 'Copy Text'}</span>
          </button>

          {/* Edit Shortcut */}
          <Link
            href={`/projects/${slug}/outlines/${outlineId}/concepts`}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Edit Concept in Concept Workspace"
          >
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </Link>

          {/* Mark Complete Toggle */}
          <button
            type="button"
            onClick={handleToggleStatus}
            disabled={isPending}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isCompleted
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
          </button>
        </div>
      </div>

      {/* Main Concept Card (Selectable & Rich LaTeX Rendering) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-m3-1 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 font-mono">
          <span>THEORY & FORMULAS</span>
          <span>Tip: Select any formula or text to copy</span>
        </div>

        {/* Content body with selectable text */}
        <div
          className={`select-text cursor-text leading-relaxed text-slate-900 dark:text-slate-100 overflow-x-auto ${
            fontSize === 'large' ? 'text-base sm:text-lg leading-loose' : 'text-sm sm:text-base'
          }`}
        >
          <MathRenderer content={concept.content} />
        </div>
      </div>

      {/* Worked Examples Section (if available) */}
      {examples.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-m3-1 space-y-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200/60 dark:border-amber-900/60">
              <Lightbulb className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Worked Examples ({examples.length})
              </h2>
              <p className="text-xs text-slate-500">
                Step-by-step applications and demonstrations for this concept.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {examples.map((ex, exIdx) => {
              const exKey = `ex-${ex.id || exIdx}`;
              const isExExpanded = Boolean(expandedExamples[exKey]);
              const statement = ex.statement || ex.problem_statement || '';
              const solution = ex.solution || ex.solution_guide || '';

              return (
                <div
                  key={ex.id || exIdx}
                  className="p-4 sm:p-6 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-4 text-xs select-text"
                >
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                        Example #{exIdx + 1}
                      </span>
                      {ex.title && <span>{ex.title}</span>}
                    </div>
                  </div>

                  {statement && (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/40 text-xs sm:text-sm text-slate-900 dark:text-slate-100 overflow-x-auto">
                      <MathRenderer content={statement} />
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={() => toggleExampleExpand(exKey)}
                      className="px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 hover:bg-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {isExExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{isExExpanded ? 'Hide Solution Steps' : 'Reveal Solution Steps'}</span>
                    </button>

                    {isExExpanded && (
                      <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-800 space-y-3 animate-in fade-in duration-150">
                        {ex.hint && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                            <strong>Hint:</strong> {ex.hint}
                          </div>
                        )}
                        <div className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 overflow-x-auto">
                          <MathRenderer content={solution || 'No detailed solution provided.'} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sequential Concept Navigation (Prev / Subchapter / Next) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        {prevConcept ? (
          <Link
            href={`/projects/${slug}/outlines/${outlineId}/concepts/${prevConcept.id}`}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm transition-all flex items-center gap-3 group"
          >
            <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Previous Concept
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block group-hover:text-indigo-600 transition-colors">
                {prevConcept.title}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            href={`/projects/${slug}?sub=${outlineId}`}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm transition-all flex items-center gap-3 group"
          >
            <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Subchapter
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block group-hover:text-indigo-600 transition-colors">
                {subchapterTitle}
              </span>
            </div>
          </Link>
        )}

        {nextConcept ? (
          <Link
            href={`/projects/${slug}/outlines/${outlineId}/concepts/${nextConcept.id}`}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm transition-all flex items-center justify-between gap-3 group text-right sm:text-left"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-right sm:text-left">
                Next Concept
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block group-hover:text-indigo-600 transition-colors text-right sm:text-left">
                {nextConcept.title}
              </span>
            </div>
            <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors flex-shrink-0">
              <ChevronRight className="w-5 h-5" />
            </span>
          </Link>
        ) : (
          <Link
            href={`/projects/${slug}?sub=${outlineId}`}
            className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-400 shadow-sm transition-all flex items-center justify-between gap-3 group"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                All Concepts Reviewed
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">
                Return to Subchapter Practice
              </span>
            </div>
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 group-hover:scale-105 transition-transform flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};
