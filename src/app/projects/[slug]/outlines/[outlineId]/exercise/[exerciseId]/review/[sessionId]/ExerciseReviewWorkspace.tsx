'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MathRenderer } from '@/components/MathRenderer';
import { formatSecondsToHHMMSS } from '@/lib/utils';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Lightbulb,
  CheckSquare,
  FileCode,
  Layers,
} from 'lucide-react';

import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';

interface ExerciseReviewWorkspaceProps {
  outlineId: string;
  exerciseId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  parentChapter?: { id: string; code: string; title: string } | null;
  exerciseTitle: string;
  problems: any[];
  sessionAttempt: any;
}

export const ExerciseReviewWorkspace: React.FC<ExerciseReviewWorkspaceProps> = ({
  outlineId,
  exerciseId,
  slug,
  projectTitle,
  subchapterCode,
  subchapterTitle,
  parentChapter,
  exerciseTitle,
  problems,
  sessionAttempt,
}) => {
  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    exerciseSet: { id: exerciseId, title: exerciseTitle },
    childPage: 'Session Review',
  });
  // Anti-Spoiler Per-Question Toggles
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});

  const toggleAnswerKey = (probId: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [probId]: !prev[probId] }));
  };

  const toggleSolution = (probId: string) => {
    setRevealedSolutions((prev) => ({ ...prev, [probId]: !prev[probId] }));
  };

  const scorePct = sessionAttempt?.score_percentage ?? 0;
  const isPassed = Boolean(sessionAttempt?.is_passed);
  const correctCount = sessionAttempt?.correct_answers ?? 0;
  const totalCount = sessionAttempt?.total_questions || problems.length;
  const durationSeconds = sessionAttempt?.duration_seconds ?? 0;

  const finishedDateStr = sessionAttempt?.finished_at
    ? new Date(sessionAttempt.finished_at * 1000).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <Breadcrumb items={breadcrumbs} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/lobby`}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Exercise Review &amp; Results: {exerciseTitle}</span>
            </h1>
          </div>
        </div>

        <Link
          href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/lobby`}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all self-start sm:self-center m3-ripple"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retake Exercise</span>
        </Link>
      </div>

      {/* Post-Exercise Score & Performance Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-2 space-y-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isPassed ? (
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Exercise Passed</span>
                </span>
              ) : (
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Below Passing Grade (70%)</span>
                </span>
              )}
              <span className="text-xs font-mono text-slate-400">Attempt #{sessionAttempt?.attempt_number || 1}</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Score: {scorePct}%
            </h2>
            <p className="text-xs text-slate-500">
              Completed on {finishedDateStr} • Stopwatch Time: {formatSecondsToHHMMSS(durationSeconds)}
            </p>
          </div>

          {/* Progress Bar & Ratio */}
          <div className="w-full sm:w-64 space-y-2">
            <div className="flex justify-between text-xs font-bold font-mono">
              <span className="text-slate-500">Accuracy Ratio</span>
              <span className="text-slate-900 dark:text-white">{correctCount} / {totalCount} Correct</span>
            </div>
            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPassed ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>
              <strong>Anti-Spoiler Review Mode:</strong> All answer keys and solution steps are hidden by default. Toggle each question card to test your memory first!
            </span>
          </div>
        </div>
      </div>

      {/* Questions Review List */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>Question-by-Question Breakdown ({problems.length})</span>
          <span className="text-xs font-mono font-normal text-slate-400">Click toggles to reveal answers or solution steps</span>
        </h3>

        {problems.map((prob, idx) => {
          const isAnsRevealed = Boolean(revealedAnswers[prob.id]);
          const isSolRevealed = Boolean(revealedSolutions[prob.id]);

          let parsedOptions: string[] = [];
          if (prob.options_json) {
            try {
              parsedOptions = JSON.parse(prob.options_json);
            } catch (e) {}
          }

          let correctIndices: number[] = [];
          if (prob.correct_option_indices) {
            try {
              correctIndices = JSON.parse(prob.correct_option_indices);
            } catch (e) {}
          } else if (typeof prob.correct_option_index === 'number') {
            correctIndices = [prob.correct_option_index];
          }

          return (
            <div
              key={prob.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-5"
            >
              {/* Question Card Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono">
                    {prob.problem_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-amber-500 font-bold font-mono">
                    Diff {prob.difficulty}/5
                  </span>
                </div>
              </div>

              {/* Problem Statement Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                <MathRenderer content={prob.problem_statement} />
              </div>

              {/* Multiple Choice Options List */}
              {parsedOptions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {parsedOptions.map((opt, oIdx) => {
                    const isKey = isAnsRevealed && correctIndices.includes(oIdx);
                    return (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                          isKey
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-semibold shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 font-mono">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <MathRenderer content={opt} />
                        </div>
                        {isKey && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" /> Correct Key
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Anti-Spoiler Toggle Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Toggle 1: Answer Key */}
                <button
                  type="button"
                  onClick={() => toggleAnswerKey(prob.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isAnsRevealed
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isAnsRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{isAnsRevealed ? 'Hide Answer Key' : 'Reveal Answer Key'}</span>
                </button>

                {/* Toggle 2: Solution Guide */}
                <button
                  type="button"
                  onClick={() => toggleSolution(prob.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isSolRevealed
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{isSolRevealed ? 'Hide Solution Steps' : 'Reveal Step-by-Step Solution'}</span>
                </button>
              </div>

              {/* Render Solution Guide when toggled */}
              {isSolRevealed && (
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 space-y-2 text-xs text-indigo-950 dark:text-indigo-200 animate-in fade-in duration-200">
                  <div className="font-bold uppercase tracking-wider text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Reference Solution Key &amp; Derivation Steps</span>
                  </div>
                  <MathRenderer content={prob.solution_guide} />
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
};
