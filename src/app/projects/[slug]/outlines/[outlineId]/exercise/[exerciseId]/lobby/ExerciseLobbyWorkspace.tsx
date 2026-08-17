'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startExerciseSessionAction } from '@/app/actions/exercise';
import { useToast } from '@/components/Toast';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import {
  ArrowLeft,
  Play,
  Clock,
  Award,
  CheckCircle2,
  Edit3,
  ShieldCheck,
  RotateCcw,
  Loader2,
  FileCode,
  Layers,
  Settings,
} from 'lucide-react';

interface ExerciseLobbyWorkspaceProps {
  outlineId: string;
  exerciseId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  parentChapter?: { id: string; code: string; title: string } | null;
  exerciseTitle: string;
  exerciseDescription: string;
  questionCount: number;
  mcqCount: number;
  essayCount: number;
  otherCount: number;
  isTimed: boolean;
  attemptsCount: number;
  bestScorePct: number | null;
  hasPassed: boolean;
  passingGrade: number;
  lastAttemptDuration: number | null;
  lastAttemptFinishedAt: number | null;
  lastAttemptSessionId?: string | null;
}

export const ExerciseLobbyWorkspace: React.FC<ExerciseLobbyWorkspaceProps> = ({
  outlineId,
  exerciseId,
  slug,
  projectTitle,
  subchapterCode,
  subchapterTitle,
  parentChapter,
  exerciseTitle,
  exerciseDescription,
  questionCount,
  mcqCount,
  essayCount,
  otherCount,
  isTimed: initialIsTimed,
  attemptsCount,
  bestScorePct,
  hasPassed,
  passingGrade,
  lastAttemptFinishedAt,
  lastAttemptSessionId,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    exerciseSet: { id: exerciseId, title: exerciseTitle },
    childPage: 'Lobby',
  });

  const [isTimed, setIsTimed] = useState(initialIsTimed);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartExercise = async () => {
    if (questionCount === 0) {
      toast('No Questions', 'Add questions to this exercise set before starting.', 'warning');
      return;
    }
    setIsStarting(true);
    const res = await startExerciseSessionAction(exerciseId, outlineId, isTimed);
    setIsStarting(false);

    if (res.error) {
      toast('Error', res.error, 'error');
      return;
    }

    router.push(
      `/session/${outlineId}?exerciseId=${exerciseId}&sessionId=${res.sessionId}${
        isTimed ? '&timed=1' : ''
      }`
    );
  };

  const formattedLastDate = lastAttemptFinishedAt
    ? new Date(lastAttemptFinishedAt * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-4 py-1 animate-in fade-in duration-200">
      
      {/* Top Header Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}`}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{exerciseTitle}</span>
              {hasPassed && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passed ({bestScorePct}%)
                </span>
              )}
            </h1>
          </div>
        </div>

        <Link
          href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}`}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition-colors shadow-xs flex items-center gap-1.5 text-xs font-bold"
          title="Manage Exercise Settings & Questions"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </div>

      {/* Single Consolidated Unified Exercise Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-6">
        
        {exerciseDescription && (
          <p className="text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            {exerciseDescription}
          </p>
        )}

        {/* Consolidated Grid: Composition + Requirements + Past Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Section 1: Composition */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-600" /> Composition
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-black">{questionCount} Total</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800">
                <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">{mcqCount}</div>
                <div className="text-[9px] font-bold uppercase text-indigo-400">MCQ</div>
              </div>
              <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800">
                <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{essayCount + otherCount}</div>
                <div className="text-[9px] font-bold uppercase text-amber-400">Essay</div>
              </div>
            </div>
          </div>

          {/* Section 2: Requirements & Timer Switch */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-violet-600" /> Passing Grade
              </span>
              <span className="font-mono text-violet-600 dark:text-violet-400 font-black text-sm">{passingGrade}%</span>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Session Timer</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTimed((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-all focus:ring-2 focus:ring-violet-500 ${
                  isTimed ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                role="switch"
                aria-checked={isTimed}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    isTimed ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 3: Past Attempt Stats */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Past Stats
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">{attemptsCount} Attempts</span>
            </div>
            <div className="flex items-center justify-between pt-1 font-mono text-xs">
              <span className="text-slate-500">Best Score:</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">{bestScorePct ?? '—'}%</span>
            </div>
            {lastAttemptSessionId && (
              <div className="pt-1">
                <Link
                  href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/review/${lastAttemptSessionId}`}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <FileCode className="w-3 h-3" />
                  <span>View last attempt review</span>
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* Compact Rules Note */}
        <div className="p-3.5 rounded-2xl bg-violet-50/60 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800 text-xs text-violet-900 dark:text-violet-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <span>Answer all questions before submitting. Answer keys and step-by-step solutions will be revealed after completion.</span>
        </div>

        {/* Primary Action Button Bar — Visible Above the Fold */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleStartExercise}
            disabled={isStarting || questionCount === 0}
            className="flex-1 py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all m3-ripple"
          >
            {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
            <span>{isStarting ? 'Starting…' : questionCount === 0 ? 'Add Questions First' : 'Start Exercise'}</span>
          </button>

          <Link
            href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}`}
            className="py-4 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
          >
            <Edit3 className="w-4 h-4" />
            <span>Manage Questions</span>
          </Link>
        </div>

      </div>
    </div>
  );
};
