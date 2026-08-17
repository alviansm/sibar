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
  BookOpen,
  TrendingUp,
  Target,
  Home,
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertCircle,
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
    childPage: 'Results',
  });

  // Anti-Spoiler Per-Question Toggles
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const toggleAnswerKey = (probId: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [probId]: !prev[probId] }));
  };

  const toggleSolution = (probId: string) => {
    setRevealedSolutions((prev) => ({ ...prev, [probId]: !prev[probId] }));
  };

  const toggleExpand = (probId: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [probId]: !prev[probId] }));
  };

  const scorePct = sessionAttempt?.score_percentage ?? 0;
  const isPassed = Boolean(sessionAttempt?.is_passed);
  const correctCount = sessionAttempt?.correct_answers ?? 0;
  const totalCount = sessionAttempt?.total_questions || problems.length;
  const durationSeconds = sessionAttempt?.duration_seconds ?? 0;
  const attemptNumber = sessionAttempt?.attempt_number ?? 1;

  const finishedDateStr = sessionAttempt?.finished_at
    ? new Date(sessionAttempt.finished_at * 1000).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now';

  // Animated SVG radial ring values
  const RING_R = 54;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRCUMFERENCE - (scorePct / 100) * RING_CIRCUMFERENCE;

  const scoreColor = isPassed
    ? 'text-emerald-500'
    : scorePct >= 50
    ? 'text-amber-500'
    : 'text-rose-500';

  const ringStroke = isPassed
    ? '#10b981'
    : scorePct >= 50
    ? '#f59e0b'
    : '#f43f5e';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/lobby`}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-violet-600 transition-all shadow-xs"
            title="Back to Exercise Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Exercise Results</p>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              {exerciseTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${slug}?sub=${outlineId}`}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition-all shadow-xs"
            title="Back to Outline"
          >
            <Home className="w-4 h-4" />
          </Link>
          <Link
            href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/lobby`}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-violet-600/30 flex items-center gap-2 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Exercise</span>
          </Link>
        </div>
      </div>

      {/* ─── Hero Score Banner ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-2 relative overflow-hidden">
        {/* Background glow */}
        <div
          className={`absolute inset-0 pointer-events-none opacity-5 ${
            isPassed
              ? 'bg-gradient-to-br from-emerald-400 to-teal-400'
              : scorePct >= 50
              ? 'bg-gradient-to-br from-amber-400 to-orange-400'
              : 'bg-gradient-to-br from-rose-400 to-pink-400'
          }`}
        />
        <div className="absolute right-0 top-0 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-8 relative">
          {/* Radial Score Ring */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <div className="relative w-40 h-40">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 128 128">
                {/* Background track */}
                <circle
                  cx="64"
                  cy="64"
                  r={RING_R}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-slate-100 dark:text-slate-800"
                />
                {/* Score arc */}
                <circle
                  cx="64"
                  cy="64"
                  r={RING_R}
                  fill="none"
                  stroke={ringStroke}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              </svg>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-black font-mono leading-none ${scoreColor}`}>
                  {scorePct}
                </span>
                <span className={`text-sm font-bold font-mono ${scoreColor}`}>%</span>
              </div>
            </div>

            {/* Pass/Fail Badge */}
            {isPassed ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5" />
                Exercise Passed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-black uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5" />
                Not Passed
              </span>
            )}
          </div>

          {/* Score Details */}
          <div className="flex-1 space-y-5 text-center md:text-left">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                Attempt #{attemptNumber} · {finishedDateStr}
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {correctCount}{' '}
                <span className="text-slate-400 font-medium">/ {totalCount}</span>{' '}
                <span className="text-lg font-semibold text-slate-500">Correct</span>
              </h2>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-3.5 h-3.5 text-violet-500" />
                </div>
                <div className="text-xl font-black text-violet-600 dark:text-violet-400 font-mono">
                  {correctCount}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Correct</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl font-black text-rose-500 dark:text-rose-400 font-mono">
                  {totalCount - correctCount}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Wrong</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-base font-black text-slate-700 dark:text-slate-200 font-mono">
                  {formatSecondsToHHMMSS(durationSeconds)}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Duration</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold font-mono text-slate-500">
                <span>Score</span>
                <span className={scoreColor}>{scorePct}% {isPassed ? '· Passed ✓' : '· Need 70% to pass'}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isPassed
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : scorePct >= 50
                      ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                      : 'bg-gradient-to-r from-rose-500 to-pink-400'
                  }`}
                  style={{ width: `${scorePct}%` }}
                />
              </div>
              {/* 70% passing marker */}
              <div className="relative h-2" style={{ marginTop: '-8px' }}>
                <div
                  className="absolute top-0 w-px h-3 bg-violet-400/60"
                  style={{ left: '70%' }}
                />
                <span
                  className="absolute top-3 text-[9px] font-bold font-mono text-violet-400 -translate-x-1/2"
                  style={{ left: '70%' }}
                >
                  70%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Action Buttons Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/lobby`}
          className="py-3.5 px-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retake Exercise</span>
        </Link>

        <Link
          href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/lobby`}
          className="py-3.5 px-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <BookOpen className="w-4 h-4 text-violet-500" />
          <span>Exercise Lobby</span>
        </Link>

        <Link
          href={`/projects/${slug}?sub=${outlineId}`}
          className="py-3.5 px-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
        >
          <Home className="w-4 h-4 text-slate-400" />
          <span>Back to Outline</span>
        </Link>
      </div>

      {/* ─── Anti-Spoiler Banner ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
        <span>
          <strong>Anti-Spoiler Review Mode:</strong> All answer keys and solution steps are hidden by default. Click each question to expand, then toggle to reveal.
        </span>
      </div>

      {/* ─── Questions Review List ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span>Question Breakdown</span>
            <span className="text-xs font-mono font-normal text-slate-400">({problems.length} questions)</span>
          </h3>
        </div>

        {problems.map((prob, idx) => {
          const isExpanded = Boolean(expandedQuestions[prob.id]);
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
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-m3-1 overflow-hidden"
            >
              {/* Question Header (always visible, clickable) */}
              <button
                type="button"
                onClick={() => toggleExpand(prob.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center font-mono flex-shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono">
                      {prob.problem_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-amber-500 font-bold font-mono">Diff {prob.difficulty}/5</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate hidden sm:block flex-1">
                    {prob.problem_statement?.replace(/\$\$?[^$]*\$\$?/g, '[math]')?.substring(0, 80)}…
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isAnsRevealed && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                      Key Revealed
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800">
                  {/* Problem Statement */}
                  <div className="pt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    <MathRenderer content={prob.problem_statement} />
                  </div>

                  {/* Multiple Choice Options List */}
                  {parsedOptions.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                              <span className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center flex-shrink-0 font-mono ${
                                isKey
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}>
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <MathRenderer content={opt} />
                            </div>
                            {isKey && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-1 flex-shrink-0">
                                <CheckSquare className="w-3 h-3" /> Key
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Anti-Spoiler Toggle Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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

                    <button
                      type="button"
                      onClick={() => toggleSolution(prob.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        isSolRevealed
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                      }`}
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>{isSolRevealed ? 'Hide Solution' : 'Reveal Solution Steps'}</span>
                    </button>
                  </div>

                  {/* Solution Guide */}
                  {isSolRevealed && (
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 space-y-2 text-xs text-indigo-950 dark:text-indigo-200 animate-in fade-in duration-200">
                      <div className="font-bold uppercase tracking-wider text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Reference Solution &amp; Derivation Steps</span>
                      </div>
                      <MathRenderer content={prob.solution_guide} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Bottom CTA ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {isPassed ? '🎉 Great work! You passed this exercise.' : '💪 Keep practicing to reach 70%.'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isPassed
              ? 'Feel free to retake for a perfect score or move on to the next topic.'
              : 'Review the answer keys and solution steps, then retake.'}
          </p>
        </div>
        <Link
          href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/lobby`}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-violet-600/25 transition-all whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retake Exercise</span>
        </Link>
      </div>
    </div>
  );
};
