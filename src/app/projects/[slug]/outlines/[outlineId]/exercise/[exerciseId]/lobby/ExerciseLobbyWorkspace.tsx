'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startExerciseSessionAction } from '@/app/actions/exercise';
import { useToast } from '@/components/Toast';
import { formatSecondsToHHMMSS } from '@/lib/utils';
import {
  ArrowLeft,
  Play,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Loader2,
  FileCode,
  Layers,
} from 'lucide-react';

interface ExerciseLobbyWorkspaceProps {
  outlineId: string;
  exerciseId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  exerciseTitle: string;
  questionCount: number;
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
  exerciseTitle,
  questionCount,
  attemptsCount,
  bestScorePct,
  hasPassed,
  passingGrade,
  lastAttemptDuration,
  lastAttemptFinishedAt,
  lastAttemptSessionId,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const [isTimed, setIsTimed] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartSession = async () => {
    if (questionCount === 0) {
      toast('No Questions', 'Please add questions to this exercise set before starting.', 'warning');
      return;
    }

    setIsStarting(true);
    const res = await startExerciseSessionAction(exerciseId, outlineId, isTimed);
    setIsStarting(false);

    if (res.error) {
      toast('Session Error', res.error, 'error');
    } else {
      toast('Session Started', 'Best of luck on your exercise set!', 'success');
      router.push(`/session/${outlineId}?exerciseId=${exerciseId}&sessionId=${res.sessionId}&timed=${isTimed ? 1 : 0}`);
    }
  };

  const formattedDate = lastAttemptFinishedAt
    ? new Date(lastAttemptFinishedAt * 1000).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Top Header Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/${slug}?sub=${outlineId}`}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
            <span>{projectTitle}</span>
            <span>/</span>
            <span>{subchapterCode} {subchapterTitle}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {exerciseTitle}
          </h1>
        </div>
      </div>

      {/* Main Lobby Hero Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-2 space-y-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Status Badge Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Exercise Problem Set</span>
            </span>

            {hasPassed ? (
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Passed ({bestScorePct}%)</span>
              </span>
            ) : attemptsCount > 0 ? (
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>In Progress (Best: {bestScorePct || 0}%)</span>
              </span>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <span>Not Attempted Yet</span>
              </span>
            )}
          </div>

          <Link
            href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}`}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4" />
            <span>Manage / Edit Questions</span>
          </Link>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Questions</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {questionCount} <span className="text-xs font-normal text-slate-500">items</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passing Grade</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {passingGrade}%
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous Attempts</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {attemptsCount} <span className="text-xs font-normal text-slate-500">reps</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Best Grade</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {bestScorePct !== null ? `${bestScorePct}%` : 'N/A'}
            </div>
          </div>
        </div>

        {/* Pre-Session Timed Controls */}
        <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30 flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                Stopwatch &amp; Timed Telemetry
              </h4>
              <p className="text-xs text-indigo-800/80 dark:text-indigo-300">
                Enable live stopwatch to track question friction and time spent per rep.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsTimed(!isTimed)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isTimed
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isTimed ? 'Timed Active' : 'Untimed Mode'}
          </button>
        </div>

        {/* Practice Guidelines & Honor Code */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Pre-Session Instructions &amp; Honor Code</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>Work through derivations on paper or scratchpad before selecting or submitting your final answers.</li>
            <li>In timed mode, avoid looking up solution steps until after submitting each problem.</li>
            <li>You can retake this exercise set anytime to improve your speed and clean solve ratio.</li>
          </ul>
        </div>

        {/* Last Attempt Timestamp info */}
        {formattedDate && (
          <div className="text-xs text-slate-400 text-center font-mono">
            Last attempted on {formattedDate} (Duration: {formatSecondsToHHMMSS(lastAttemptDuration || 0)})
          </div>
        )}

        {/* Primary & Review Action Buttons */}
        <div className="pt-2 space-y-3">
          <button
            type="button"
            onClick={handleStartSession}
            disabled={isStarting || questionCount === 0}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 m3-ripple"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Launching Exercise Session...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white" />
                <span>{attemptsCount > 0 ? 'Retake Exercise Session' : 'Start Exercise Session'}</span>
              </>
            )}
          </button>

          {lastAttemptSessionId && (
            <Link
              href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/review/${lastAttemptSessionId}`}
              className="w-full py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Review Past Attempt Results &amp; Answers</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
