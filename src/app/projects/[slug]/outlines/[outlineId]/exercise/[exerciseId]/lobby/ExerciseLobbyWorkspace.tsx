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
  Timer,
  TimerOff,
  AlarmClock,
  RotateCw,
  AlertTriangle,
  X,
} from 'lucide-react';

type TimerMode = 'none' | 'stopwatch' | 'countdown';

const COUNTDOWN_PRESETS = [
  { label: '30 min', seconds: 30 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
  { label: '90 min', seconds: 90 * 60 },
  { label: '120 min', seconds: 120 * 60 },
];

export interface InProgressSession {
  sessionId: string;
  startedAt: number;
  timerMode: TimerMode;
  countdownSeconds: number;
  answersJson: string | null;
  answeredCount: number;
}

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
  /** Present when there is an unfinished session for this exercise */
  inProgressSession?: InProgressSession | null;
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
  inProgressSession,
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

  const [timerMode, setTimerMode] = useState<TimerMode>(initialIsTimed ? 'stopwatch' : 'none');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(60 * 60);
  const [customHours, setCustomHours] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showFreshStartWarning, setShowFreshStartWarning] = useState(false);

  const countdownSeconds = (() => {
    if (useCustom) {
      const h = parseInt(customHours || '0', 10) || 0;
      const m = parseInt(customMinutes || '0', 10) || 0;
      return h * 3600 + m * 60;
    }
    return selectedPreset ?? 3600;
  })();

  const handleResumeSession = () => {
    if (!inProgressSession) return;
    const { sessionId, startedAt, timerMode: mode, countdownSeconds: cd, answersJson } = inProgressSession;
    const params = new URLSearchParams({
      exerciseId,
      sessionId,
      timerMode: mode,
      startedAt: String(startedAt),
    });
    if (mode === 'countdown') params.set('countdown', String(cd));
    if (answersJson) params.set('answers', btoa(encodeURIComponent(answersJson)));
    router.push(`/session/${outlineId}?${params.toString()}`);
  };

  const handleStartFreshExercise = async () => {
    if (questionCount === 0) {
      toast('No Questions', 'Add questions to this exercise set before starting.', 'warning');
      return;
    }
    if (timerMode === 'countdown' && countdownSeconds < 60) {
      toast('Invalid Duration', 'Please set a countdown duration of at least 1 minute.', 'warning');
      return;
    }
    setIsStarting(true);
    const isTimed = timerMode !== 'none';
    const res = await startExerciseSessionAction(exerciseId, outlineId, isTimed, timerMode, timerMode === 'countdown' ? countdownSeconds : 0);
    setIsStarting(false);

    if (res.error) {
      toast('Error', res.error, 'error');
      return;
    }

    const params = new URLSearchParams({
      exerciseId,
      sessionId: res.sessionId!,
      timerMode,
      startedAt: String(res.startedAt!),
    });
    if (timerMode === 'countdown') params.set('countdown', String(countdownSeconds));
    router.push(`/session/${outlineId}?${params.toString()}`);
  };

  const handleStartExercise = () => {
    if (inProgressSession && !showFreshStartWarning) {
      setShowFreshStartWarning(true);
      return;
    }
    setShowFreshStartWarning(false);
    handleStartFreshExercise();
  };

  const formattedLastDate = lastAttemptFinishedAt
    ? new Date(lastAttemptFinishedAt * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatElapsed = (startedAt: number) => {
    const elapsed = Math.floor(Date.now() / 1000) - startedAt;
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    if (h > 0) return `${h}h ${m}m elapsed`;
    return `${m}m elapsed`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 py-1 animate-in fade-in duration-200">

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

      {/* ── In-Progress Session Banner ───────────────────────────────────────── */}
      {inProgressSession && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-3xl p-5 space-y-3 animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900">
              <RotateCw className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900 dark:text-amber-100">
                You have an unfinished session
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {inProgressSession.answeredCount} of {questionCount} questions answered
                {' · '}
                {inProgressSession.timerMode !== 'none'
                  ? inProgressSession.timerMode === 'countdown'
                    ? `${formatCountdown(inProgressSession.countdownSeconds)} countdown`
                    : 'Stopwatch'
                  : 'No Timer'}
                {' · '}
                {formatElapsed(inProgressSession.startedAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResumeSession}
            className="w-full py-3 px-5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-600/30 transition-all"
          >
            <RotateCw className="w-4 h-4" />
            <span>Resume Unfinished Session</span>
          </button>
        </div>
      )}

      {/* Fresh Start Warning Modal */}
      {showFreshStartWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Start Fresh?</h3>
              <button
                onClick={() => setShowFreshStartWarning(false)}
                className="ml-auto p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You have an in-progress session with {inProgressSession?.answeredCount} answers saved.
              Starting fresh will abandon it and create a new session.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowFreshStartWarning(false)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowFreshStartWarning(false); handleStartFreshExercise(); }}
                disabled={isStarting}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Exercise Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-6">

        {exerciseDescription && (
          <p className="text-xs text-slate-500 pb-2 border-b border-slate-100 dark:border-slate-800">
            {exerciseDescription}
          </p>
        )}

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

          {/* Section 2: Timer Mode */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-violet-600" /> Passing Grade
              </span>
              <span className="font-mono text-violet-600 dark:text-violet-400 font-black text-sm">{passingGrade}%</span>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Clock className="w-3 h-3" />
                <span>Session Timer</span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-700/60">
                {([
                  { mode: 'none' as TimerMode, label: 'None', icon: TimerOff },
                  { mode: 'stopwatch' as TimerMode, label: 'Stopwatch', icon: Clock },
                  { mode: 'countdown' as TimerMode, label: 'Countdown', icon: AlarmClock },
                ] as const).map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTimerMode(mode)}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all ${
                      timerMode === mode
                        ? 'bg-white dark:bg-slate-900 text-violet-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Past Stats */}
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

        {/* Countdown Duration Picker */}
        {timerMode === 'countdown' && (
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/60 space-y-3 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              <AlarmClock className="w-3.5 h-3.5" />
              <span>Set Countdown Duration</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {COUNTDOWN_PRESETS.map((preset) => (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => { setSelectedPreset(preset.seconds); setUseCustom(false); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    !useCustom && selectedPreset === preset.seconds
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:text-rose-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  useCustom
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:text-rose-600'
                }`}
              >
                Custom
              </button>
            </div>

            {useCustom && (
              <div className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min="0" max="23" value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)} placeholder="0"
                    className="w-16 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-500">hr</span>
                </div>
                <span className="text-slate-400 font-bold">:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number" min="0" max="59" value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)} placeholder="0"
                    className="w-16 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-500">min</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400 font-semibold">
              <Timer className="w-3.5 h-3.5" />
              <span>
                Time limit:{' '}
                <span className="font-black font-mono">
                  {countdownSeconds >= 60 ? formatCountdown(countdownSeconds) : '—'}
                </span>
                {' '}— exercise auto-submits when the timer reaches zero.
              </span>
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-violet-50/60 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-800 text-xs text-violet-900 dark:text-violet-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <span>Answer all questions before submitting. Answer keys and step-by-step solutions will be revealed after completion.</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleStartExercise}
            disabled={isStarting || questionCount === 0 || (timerMode === 'countdown' && countdownSeconds < 60)}
            className="flex-1 py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-violet-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all m3-ripple"
          >
            {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
            <span>
              {isStarting
                ? 'Starting…'
                : questionCount === 0
                ? 'Add Questions First'
                : timerMode === 'countdown' && countdownSeconds < 60
                ? 'Set a Valid Duration'
                : inProgressSession
                ? 'Start Fresh Session'
                : 'Start Exercise'}
            </span>
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
