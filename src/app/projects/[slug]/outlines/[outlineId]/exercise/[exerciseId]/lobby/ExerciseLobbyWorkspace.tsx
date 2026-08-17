'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { startExerciseSessionAction, updateExerciseSetAction } from '@/app/actions/exercise';
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
  Save,
  Info,
} from 'lucide-react';

interface ExerciseLobbyWorkspaceProps {
  outlineId: string;
  exerciseId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
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
  passingGrade: initialPassingGrade,
  lastAttemptDuration,
  lastAttemptFinishedAt,
  lastAttemptSessionId,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Editable, persistent exercise settings
  const [passingGrade, setPassingGrade] = useState(initialPassingGrade);
  const [isTimed, setIsTimed] = useState(initialIsTimed);
  const [isSaving, setIsSaving] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const res = await updateExerciseSetAction(exerciseId, {
      passing_grade: passingGrade,
      is_timed: isTimed,
    });
    setIsSaving(false);
    if (res.error) {
      toast('Save Failed', res.error, 'error');
    } else {
      toast('Settings Saved', 'Passing grade and timer updated.', 'success');
    }
  };

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
    router.push(`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/session/${res.sessionId}`);
  };

  const formattedLastDate = lastAttemptFinishedAt
    ? new Date(lastAttemptFinishedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/${slug}?sub=${outlineId}`}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span>{projectTitle}</span>
            <span>/</span>
            <span className="text-indigo-600 font-semibold">{subchapterCode}</span>
            <span>/</span>
            <span className="text-violet-600 font-semibold">Exercise</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{exerciseTitle}</h1>
          {exerciseDescription && (
            <p className="text-sm text-slate-500 mt-0.5">{exerciseDescription}</p>
          )}
        </div>
      </div>

      {/* Passed banner */}
      {hasPassed && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Passed!</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-500">Best score: {bestScorePct}% · Passing grade: {passingGrade}%</div>
          </div>
        </div>
      )}

      {/* Question Composition */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-600" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Exercise Composition</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{questionCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Total</div>
          </div>
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800 text-center">
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{mcqCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mt-0.5">MCQ</div>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 text-center">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{essayCount + otherCount}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mt-0.5">Essay / Other</div>
          </div>
        </div>
      </div>

      {/* Editable Settings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Exercise Settings</h2>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saving…' : 'Save Settings'}</span>
          </button>
        </div>

        {/* Passing Grade Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Passing Grade
            </label>
            <span className="text-sm font-black text-violet-600 dark:text-violet-400 font-mono">{passingGrade}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={passingGrade}
            onChange={(e) => setPassingGrade(Number(e.target.value))}
            className="w-full h-2 accent-violet-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0% (No min)</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Timer Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Timer</div>
              <div className="text-[11px] text-slate-400">Track time spent during this exercise</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsTimed((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-all focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
              isTimed ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
            role="switch"
            aria-checked={isTimed}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                isTimed ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Past Attempts */}
      {attemptsCount > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Past Attempts</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{attemptsCount}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attempts</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-xl font-black text-violet-600 dark:text-violet-400 font-mono">{bestScorePct ?? '—'}%</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Best Score</div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="text-sm font-black text-slate-500 font-mono">{formattedLastDate ?? '—'}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Attempt</div>
            </div>
          </div>
          {lastAttemptSessionId && (
            <Link
              href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}/session/${lastAttemptSessionId}/review`}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>View last attempt results</span>
            </Link>
          )}
        </div>
      )}

      {/* Rules & Good Luck */}
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 border border-violet-200/60 dark:border-violet-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-600" />
          <h2 className="text-sm font-bold text-violet-800 dark:text-violet-300 uppercase tracking-wider">Before You Begin</h2>
        </div>
        <ul className="text-xs text-violet-800 dark:text-violet-300 space-y-2">
          <li className="flex items-start gap-2"><span className="font-bold mt-0.5">•</span> Try your best on every question before revealing hints or answers.</li>
          <li className="flex items-start gap-2"><span className="font-bold mt-0.5">•</span> You will see all answers and solutions <strong>after</strong> submitting.</li>
          {isTimed && <li className="flex items-start gap-2"><span className="font-bold mt-0.5">•</span> A timer will track your total time. Stay focused!</li>}
          <li className="flex items-start gap-2"><span className="font-bold mt-0.5">•</span> Passing grade for this exercise: <strong>{passingGrade}%</strong>.</li>
          <li className="flex items-start gap-2"><span className="font-bold mt-0.5">•</span> Good luck and do your absolute best! 🎯</li>
        </ul>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleStartExercise}
          disabled={isStarting || questionCount === 0}
          className="flex-1 py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-violet-600/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
          <span>{isStarting ? 'Starting…' : questionCount === 0 ? 'Add Questions First' : 'Start Exercise'}</span>
        </button>

        <Link
          href={`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}`}
          className="py-4 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-300 font-bold text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all"
        >
          <Edit3 className="w-4 h-4" />
          <span>Manage Questions</span>
        </Link>
      </div>
    </div>
  );
};
