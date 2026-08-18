'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MathRenderer } from '@/components/MathRenderer';
import { formatSecondsToHHMMSS } from '@/lib/utils';
import { finishExerciseSessionAction, startExerciseSessionAction, saveSessionProgressAction, abandonExerciseSessionAction } from '@/app/actions/exercise';
import { logAttemptAction } from '@/app/actions/session';
import { useToast } from '@/components/Toast';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Play,
  Pause,
  Award,
  Layers,
  Flag,
  LayoutGrid,
  ChevronDown,
  Check,
  AlarmClock,
  TimerOff,
} from 'lucide-react';

type TimerMode = 'none' | 'stopwatch' | 'countdown';
type WarningKey = 'half' | 'fifteen' | 'five';

interface WarningConfig {
  key: WarningKey;
  title: string;
  message: string;
  shouldFire: (remaining: number, total: number) => boolean;
  urgency: 'amber' | 'rose';
}

const WARNINGS: WarningConfig[] = [
  {
    key: 'half',
    title: '⏳ Halfway Through Your Time',
    message: "You've used half of your allotted time. Keep a steady pace!",
    shouldFire: (remaining, total) => total > 120 && remaining <= Math.floor(total / 2),
    urgency: 'amber',
  },
  {
    key: 'fifteen',
    title: '⚠️ 15 Minutes Remaining',
    message: 'You have 15 minutes left. Start wrapping up any remaining questions.',
    shouldFire: (remaining, total) => total > 900 && remaining <= 900,
    urgency: 'amber',
  },
  {
    key: 'five',
    title: '🚨 5 Minutes Remaining!',
    message: 'Only 5 minutes left! The exercise will auto-submit when the timer reaches zero.',
    shouldFire: (remaining, _total) => remaining <= 300,
    urgency: 'rose',
  },
];

interface PracticeSessionRunnerProps {
  outlineId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  parentChapter?: { id: string; code: string; title: string } | null;
  problems: any[];
  sessionId?: string;
  exerciseId?: string;
  timerMode?: TimerMode;
  countdownSeconds?: number;
  /** Unix timestamp when the session was created (from DB). Used for server-side timer. */
  startedAt?: number;
  /** Pre-loaded answers for resume */
  initialAnswers?: Record<number, string>;
  /** @deprecated use timerMode='stopwatch' */
  initialIsTimed?: boolean;
}

// Derive current timer value from server timestamp
function deriveSeconds(
  timerMode: TimerMode,
  countdownSeconds: number,
  startedAt: number | undefined
): number {
  if (timerMode === 'none') return 0;
  const nowUnix = Math.floor(Date.now() / 1000);
  const elapsed = startedAt ? Math.max(0, nowUnix - startedAt) : 0;
  if (timerMode === 'countdown') {
    return Math.max(0, countdownSeconds - elapsed);
  }
  // stopwatch
  return elapsed;
}

const AUTO_SAVE_INTERVAL_MS = 30_000; // 30 seconds
const DEBOUNCE_SAVE_MS = 2_000; // 2 seconds after last answer change

export const PracticeSessionRunner: React.FC<PracticeSessionRunnerProps> = ({
  outlineId,
  slug,
  projectTitle,
  subchapterCode,
  subchapterTitle,
  parentChapter,
  problems,
  sessionId,
  exerciseId,
  timerMode: timerModeProp,
  countdownSeconds: countdownSecondsProp = 0,
  startedAt,
  initialAnswers,
  initialIsTimed,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const resolvedTimerMode: TimerMode = timerModeProp ?? (initialIsTimed ? 'stopwatch' : 'none');
  const totalCountdownSeconds = resolvedTimerMode === 'countdown' ? countdownSecondsProp : 0;

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    childPage: 'Practice Session',
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [seconds, setSeconds] = useState(() =>
    deriveSeconds(resolvedTimerMode, totalCountdownSeconds, startedAt)
  );
  const [isActive, setIsActive] = useState(true);
  const timerMode = resolvedTimerMode;

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>(initialAnswers ?? {});
  const [userNotes, setUserNotes] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);

  // Navigation guard: pending URL to navigate to after confirmation
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  // Warning state
  const [firedWarnings, setFiredWarnings] = useState<Set<WarningKey>>(new Set());
  const [activeWarning, setActiveWarning] = useState<WarningConfig | null>(null);
  const [showTimesUpModal, setShowTimesUpModal] = useState(false);

  // Refs for use inside callbacks without stale closures
  const secondsRef = useRef(seconds);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  const selectedAnswersRef = useRef(selectedAnswers);
  useEffect(() => { selectedAnswersRef.current = selectedAnswers; }, [selectedAnswers]);
  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);
  const showLeaveModalRef = useRef(showLeaveModal);
  useEffect(() => { showLeaveModalRef.current = showLeaveModal; }, [showLeaveModal]);
  const sessionIdRef = useRef(sessionId);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  const isNavigatingIntentionallyRef = useRef(false);

  const currentProb = problems[currentIndex];

  // ── Auto-save debounce ref ─────────────────────────────────────────────────
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProgress = useCallback(async () => {
    if (!sessionIdRef.current) return;
    const answersJson = JSON.stringify(selectedAnswersRef.current);
    await saveSessionProgressAction(sessionIdRef.current, answersJson).catch(() => {});
  }, []);

  // Debounced save on answer change
  useEffect(() => {
    if (!sessionId) return;
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveProgress();
    }, DEBOUNCE_SAVE_MS);
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [selectedAnswers, sessionId, saveProgress]);

  // Periodic auto-save every 30 seconds
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(saveProgress, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId, saveProgress]);

  // ── Server-side timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (timerMode === 'none' || !isActive || !currentProb) return;

    const tick = () => {
      const derived = deriveSeconds(timerMode, totalCountdownSeconds, startedAt);
      setSeconds(derived);

      if (timerMode === 'countdown') {
        setFiredWarnings((fired) => {
          const newFired = new Set(fired);
          for (const w of WARNINGS) {
            if (!fired.has(w.key) && w.shouldFire(derived, totalCountdownSeconds)) {
              newFired.add(w.key);
              if (derived > 0) setActiveWarning(w);
            }
          }
          return newFired;
        });

        if (derived <= 0 && !isSubmittingRef.current) {
          setShowTimesUpModal(true);
        }
      }
    };

    tick(); // immediate first tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timerMode, isActive, currentProb, totalCountdownSeconds, startedAt]);

  // ── Navigation Guard ───────────────────────────────────────────────────────
  // 1. Browser tab close / page refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 2. Intercept any link clicks (Navbar, Breadcrumb, Logo, Links) across the page
  useEffect(() => {
    const handleClickCapture = (e: MouseEvent) => {
      if (isSubmittingRef.current || isNavigatingIntentionallyRef.current) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor || !anchor.href) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      try {
        const targetUrl = new URL(anchor.href, window.location.href);
        if (targetUrl.origin === window.location.origin) {
          const isSamePage = targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search;
          if (!isSamePage) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            setPendingNavUrl(anchor.href);
            setShowLeaveModal(true);
          }
        }
      } catch (err) {}
    };

    document.addEventListener('click', handleClickCapture, true);
    return () => {
      document.removeEventListener('click', handleClickCapture, true);
    };
  }, []);

  // 3. Intercept browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (showLeaveModalRef.current || isSubmittingRef.current || isNavigatingIntentionallyRef.current) return;
      window.history.pushState(null, '', pathname);
      setPendingNavUrl(null);
      setShowLeaveModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', pathname);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname]);

  if (!currentProb || problems.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-m3-1">
        <Sparkles className="w-10 h-10 text-indigo-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Questions in this Exercise</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Add questions to this exercise set before starting a practice session.
        </p>
        <Link
          href={`/projects/${slug}?sub=${outlineId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
        >
          Return to Workspace
        </Link>
      </div>
    );
  }

  const handleOptionSelect = (optionText: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optionText }));
  };

  const handleNotesChange = (text: string) => {
    setUserNotes((prev) => ({ ...prev, [currentIndex]: text }));
  };

  const toggleFlag = (index: number) => {
    setFlaggedQuestions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  };

  const handleNextQuestion = () => {
    if (currentIndex < problems.length - 1) setCurrentIndex((p) => p + 1);
  };

  // Compute final elapsed for DB
  const computeFinalSeconds = () => {
    const nowUnix = Math.floor(Date.now() / 1000);
    if (timerMode === 'countdown') {
      return startedAt ? Math.min(totalCountdownSeconds, nowUnix - startedAt) : totalCountdownSeconds - secondsRef.current;
    }
    return startedAt ? nowUnix - startedAt : secondsRef.current;
  };

  const handleFinalSubmit = async (overrideAnswers?: Record<number, string>) => {
    setIsActive(false);
    setIsSubmitting(true);
    const finalSeconds = computeFinalSeconds();
    const answersToGrade = overrideAnswers ?? selectedAnswersRef.current;

    const gradedProblems = problems.map((prob, i) => {
      const selected = answersToGrade[i] || null;
      let parsedOpts: string[] = [];
      if (prob.problem_type === 'multiple_choice' && prob.options_json) {
        try { parsedOpts = JSON.parse(prob.options_json); } catch (e) {}
      }
      let isMcqCorrect = false;
      if (prob.problem_type === 'multiple_choice' && selected) {
        let correctIndices: number[] = [];
        if (prob.correct_option_indices) {
          try { correctIndices = JSON.parse(prob.correct_option_indices); } catch (e) {}
        } else if (typeof prob.correct_option_index === 'number') {
          correctIndices = [prob.correct_option_index];
        }
        const chosenIndex = parsedOpts.indexOf(selected);
        if (correctIndices.length > 0 && chosenIndex !== -1) {
          isMcqCorrect = correctIndices.includes(chosenIndex);
        }
      }
      return { prob, selected, isMcqCorrect };
    });

    const correctCount = gradedProblems.filter((g) => g.isMcqCorrect).length;
    const totalCount = problems.length;
    const scorePct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const targetExId = exerciseId || currentProb.exercise_id || outlineId;
    let activeSessionId = sessionId;
    const finalAnswersJson = JSON.stringify(answersToGrade);

    if (!activeSessionId) {
      const res = await startExerciseSessionAction(targetExId, outlineId, timerMode !== 'none', timerMode, totalCountdownSeconds).catch(() => null);
      if (res?.sessionId) {
        activeSessionId = res.sessionId;
        await finishExerciseSessionAction(res.sessionId, correctCount, totalCount, finalSeconds, 70, finalAnswersJson).catch(console.error);
      }
    } else {
      finishExerciseSessionAction(activeSessionId, correctCount, totalCount, finalSeconds, 70, finalAnswersJson).catch(console.error);
    }

    Promise.all(
      gradedProblems.map(({ prob, selected, isMcqCorrect }) =>
        logAttemptAction(
          prob.id, outlineId,
          Math.round(finalSeconds / Math.max(1, totalCount)),
          isMcqCorrect ? 'clean_solve' : 'surrendered',
          1,
          selected ? `Selected Choice: ${selected}` : ''
        )
      )
    ).catch(console.error);

    setIsSubmitting(false);
    setShowLeaveModal(false);
    setShowTimesUpModal(false);
    toast('Exercise Submitted!', `Finished with ${correctCount}/${totalCount} correct answers.`, 'success');

    const encodedAnswers = btoa(encodeURIComponent(JSON.stringify(answersToGrade)));
    const reviewParams = new URLSearchParams({
      answers: encodedAnswers,
      score: String(scorePct),
      correct: String(correctCount),
      total: String(totalCount),
      dur: String(finalSeconds),
      timed: timerMode !== 'none' ? '1' : '0',
    });
    doNavigate(`/projects/${slug}/outlines/${outlineId}/exercise/${targetExId}/review/${activeSessionId}?${reviewParams.toString()}`);
  };

  // Navigate bypassing the guard (used after submit/abandon/temporary leave when we intentionally leave)
  const doNavigate = (url: string) => {
    isNavigatingIntentionallyRef.current = true;
    try {
      router.push(url);
    } catch (e) {
      window.location.href = url;
    }
  };

  const handleLeaveTemporary = async () => {
    setShowLeaveModal(false);
    await saveProgress();
    toast('Session Saved', 'You can resume this exercise anytime from the study project.', 'info');
    const dest = pendingNavUrl ?? `/projects/${slug}?sub=${outlineId}`;
    setPendingNavUrl(null);
    doNavigate(dest);
  };

  const handleAbandonExercise = async () => {
    setShowLeaveModal(false);
    if (sessionIdRef.current) {
      await abandonExerciseSessionAction(sessionIdRef.current).catch(() => {});
    }
    toast('Exercise Abandoned', 'Session discarded without logging score.', 'info');
    const dest = pendingNavUrl ?? `/projects/${slug}?sub=${outlineId}`;
    setPendingNavUrl(null);
    doNavigate(dest);
  };

  const handleLeaveModalSubmit = async () => {
    await handleFinalSubmit();
    // After submit, navigate to pending URL if any
    if (pendingNavUrl) {
      doNavigate(pendingNavUrl);
      setPendingNavUrl(null);
    }
  };

  const handleLeaveModalResume = () => {
    setPendingNavUrl(null);
    setShowLeaveModal(false);
  };

  let parsedOptions: string[] = [];
  if (currentProb.problem_type === 'multiple_choice' && currentProb.options_json) {
    try { parsedOptions = JSON.parse(currentProb.options_json); } catch (e) {}
  }

  const currentSelected = selectedAnswers[currentIndex] || null;
  const answeredCount = Object.keys(selectedAnswers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;

  const isCountdownCritical = timerMode === 'countdown' && seconds <= 300 && seconds > 0;
  const isCountdownWarning = timerMode === 'countdown' && seconds <= 900 && seconds > 300;

  const getSquareButtonStyle = (pIdx: number) => {
    const isCurrent = pIdx === currentIndex;
    const isFlagged = Boolean(flaggedQuestions[pIdx]);
    const isAnswered = Boolean(selectedAnswers[pIdx]);
    if (isCurrent) return 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-2 ring-violet-400 scale-105 z-10 font-black';
    if (isFlagged) return 'bg-amber-400 text-amber-950 font-black border border-amber-500 hover:bg-amber-300 dark:bg-amber-400 dark:text-slate-950 shadow-xs';
    if (isAnswered) return 'bg-emerald-500 text-white font-bold border border-emerald-600 hover:bg-emerald-400 dark:bg-emerald-600 shadow-xs';
    return 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">

      {/* Header & Timer Bar */}
      <Breadcrumb items={breadcrumbs} />
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-m3-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setPendingNavUrl(null); setShowLeaveModal(true); }}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors"
            title="Leave Exercise"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {subchapterTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Stopwatch display */}
          {timerMode === 'stopwatch' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-mono text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-violet-600 animate-pulse" />
              <span>{formatSecondsToHHMMSS(seconds)}</span>
              <button type="button" onClick={() => setIsActive(!isActive)} className="ml-1 text-violet-500 hover:text-violet-700" title={isActive ? 'Pause' : 'Resume'}>
                {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* Countdown display */}
          {timerMode === 'countdown' && (
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl font-mono text-xs font-bold border transition-all ${
              isCountdownCritical
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : isCountdownWarning
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              <AlarmClock className={`w-3.5 h-3.5 ${isCountdownCritical ? 'text-rose-600 animate-pulse' : isCountdownWarning ? 'text-amber-500' : 'text-slate-500'}`} />
              <span>{formatSecondsToHHMMSS(seconds)}</span>
              <button type="button" onClick={() => setIsActive(!isActive)} className={`ml-1 ${isCountdownCritical ? 'text-rose-500 hover:text-rose-700' : 'text-slate-400 hover:text-slate-600'}`} title={isActive ? 'Pause' : 'Resume'}>
                {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* No timer badge */}
          {timerMode === 'none' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 font-mono text-xs">
              <TimerOff className="w-3.5 h-3.5" />
              <span>No Timer</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowNavModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-xs"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-violet-600" />
            <span>Question Navigation ({answeredCount}/{problems.length})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Current Question Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 space-y-6">

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-2xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 text-violet-600 font-black text-xs flex items-center justify-center font-mono">
              #{currentIndex + 1}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {currentProb.problem_type.replace('_', ' ')}
            </span>
            <span className="text-xs text-amber-500 font-bold font-mono">Diff {currentProb.difficulty}/5</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleFlag(currentIndex)}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                flaggedQuestions[currentIndex]
                  ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-300 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentIndex] ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{flaggedQuestions[currentIndex] ? 'Flagged' : 'Flag Question'}</span>
            </button>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">Question {currentIndex + 1} of {problems.length}</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
          <MathRenderer content={currentProb.problem_statement} />
        </div>

        {currentProb.problem_type === 'multiple_choice' && parsedOptions.length > 0 && (
          <div className="space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Select Your Answer Choice</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parsedOptions.map((optText, oIdx) => {
                const isSelected = currentSelected === optText;
                return (
                  <button
                    key={oIdx} type="button" onClick={() => handleOptionSelect(optText)}
                    className={`p-4 rounded-2xl border text-xs text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-violet-50 dark:bg-violet-950/60 border-2 border-violet-600 text-violet-950 dark:text-violet-100 font-bold shadow-md shadow-violet-600/10'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <div className="flex-1"><MathRenderer content={optText} /></div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentProb.problem_type !== 'multiple_choice' && (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Your Answer / Derivation Notes (LaTeX supported)</label>
            <textarea
              rows={4} value={userNotes[currentIndex] || ''} onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Write your answer, steps, or final numeric calculation here..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={handlePrevQuestion} disabled={currentIndex === 0}
            className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all">
            <ChevronLeft className="w-4 h-4" /><span>Previous</span>
          </button>

          <div className="flex items-center gap-3">
            {currentIndex < problems.length - 1 ? (
              <button type="button" onClick={() => setCurrentIndex((p) => p + 1)}
                className="px-6 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md">
                <span>Next Question</span><ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={() => handleFinalSubmit()} disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-600/30 disabled:opacity-50 m3-ripple">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                <span>{isSubmitting ? 'Submitting…' : 'Submit Exercise'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Question Navigation Modal ─────────────────────────────────────────── */}
      {showNavModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 border border-violet-200/60">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Question Navigation</h3>
                  <p className="text-xs text-slate-500">{problems.length} Total Questions in Exercise</p>
                </div>
              </div>
              <button onClick={() => setShowNavModal(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold px-1 py-1 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-violet-600 shadow-xs" /><span>Current ({currentIndex + 1})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600" /><span>Answered ({answeredCount})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-amber-400 border border-amber-500" /><span>Flagged ({flaggedCount})</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" /><span>Unanswered ({problems.length - answeredCount})</span></div>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 font-mono text-xs">
                {problems.map((p, pIdx) => (
                  <button key={p.id || pIdx} type="button"
                    onClick={() => { setCurrentIndex(pIdx); setShowNavModal(false); }}
                    className={`h-10 rounded-xl flex items-center justify-center gap-1 transition-all relative ${getSquareButtonStyle(pIdx)}`}
                    title={`Go to Question ${pIdx + 1}${flaggedQuestions[pIdx] ? ' (Flagged)' : ''}${selectedAnswers[pIdx] ? ' (Answered)' : ''}`}
                  >
                    <span>Q{pIdx + 1}</span>
                    {flaggedQuestions[pIdx] ? <Flag className="w-3 h-3 fill-amber-950 text-amber-950" /> : selectedAnswers[pIdx] && pIdx !== currentIndex ? <Check className="w-3 h-3 text-white" /> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button type="button" onClick={() => setShowNavModal(false)} className="px-5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all">
                Close Navigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave / Navigation Guard Modal ───────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Leave Exercise Session?</h3>
              </div>
              <button onClick={handleLeaveModalResume} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You are currently in an active exercise session.
              {sessionId ? ' Your progress is auto-saved and you can resume later from the study project.' : ''}
              {' '}What would you like to do?
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleLeaveModalSubmit}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                <span>{isSubmitting ? 'Submitting…' : 'Submit & View Results'}</span>
              </button>

              <button
                type="button"
                onClick={handleLeaveTemporary}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>Leave Temporarily (Resume Later)</span>
              </button>

              <button
                type="button"
                onClick={handleAbandonExercise}
                className="w-full py-2.5 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200/80 font-bold text-xs transition-all"
              >
                Abandon (Leave Without Submitting)
              </button>

              <button
                type="button"
                onClick={handleLeaveModalResume}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 transition-all"
              >
                Resume Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mid-session Warning Modal ─────────────────────────────────────────── */}
      {activeWarning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${
            activeWarning.urgency === 'rose'
              ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-700'
              : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${activeWarning.urgency === 'rose' ? 'bg-rose-100 dark:bg-rose-900' : 'bg-amber-100 dark:bg-amber-900'}`}>
                <AlertTriangle className={`w-5 h-5 ${activeWarning.urgency === 'rose' ? 'text-rose-600' : 'text-amber-600'}`} />
              </div>
              <h3 className={`text-sm font-black ${activeWarning.urgency === 'rose' ? 'text-rose-900 dark:text-rose-100' : 'text-amber-900 dark:text-amber-100'}`}>
                {activeWarning.title}
              </h3>
            </div>
            <p className={`text-xs leading-relaxed ${activeWarning.urgency === 'rose' ? 'text-rose-800 dark:text-rose-200' : 'text-amber-800 dark:text-amber-200'}`}>
              {activeWarning.message}
            </p>
            {timerMode === 'countdown' && (
              <div className={`font-mono text-2xl font-black text-center py-2 ${activeWarning.urgency === 'rose' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {formatSecondsToHHMMSS(seconds)}
              </div>
            )}
            <button type="button" onClick={() => setActiveWarning(null)}
              className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${activeWarning.urgency === 'rose' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'}`}>
              Got it — Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Time's Up Modal ───────────────────────────────────────────────────── */}
      {showTimesUpModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-700 rounded-3xl p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-rose-100 dark:bg-rose-950">
                <AlarmClock className="w-8 h-8 text-rose-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Time&rsquo;s Up!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                Your countdown timer has expired. The exercise will now be auto-submitted with your current answers.
              </p>
            </div>
            <button type="button" onClick={() => handleFinalSubmit()} disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
              <span>{isSubmitting ? 'Submitting…' : 'View Results'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
