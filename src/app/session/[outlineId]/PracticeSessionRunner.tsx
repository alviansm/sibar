'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MathRenderer } from '@/components/MathRenderer';
import { formatSecondsToHHMMSS } from '@/lib/utils';
import { finishExerciseSessionAction, startExerciseSessionAction } from '@/app/actions/exercise';
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
  HelpCircle,
  Flag,
  LayoutGrid,
  ChevronDown,
  Check,
  AlarmClock,
  TimerOff,
} from 'lucide-react';

type TimerMode = 'none' | 'stopwatch' | 'countdown';

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
  /** New unified timer mode */
  timerMode?: TimerMode;
  /** Countdown duration in seconds (only used when timerMode='countdown') */
  countdownSeconds?: number;
  /** @deprecated use timerMode='stopwatch' instead */
  initialIsTimed?: boolean;
}

// Warning thresholds for countdown mode
type WarningKey = 'half' | 'fifteen' | 'five';

interface WarningConfig {
  key: WarningKey;
  title: string;
  message: string;
  /** Predicate: returns true when this warning should fire */
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
  initialIsTimed,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  // Resolve timer mode — handle legacy initialIsTimed prop
  const resolvedTimerMode: TimerMode =
    timerModeProp ?? (initialIsTimed ? 'stopwatch' : 'none');
  const totalCountdownSeconds = resolvedTimerMode === 'countdown' ? countdownSecondsProp : 0;

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    childPage: 'Practice Session',
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  // `seconds` meaning:
  //   - stopwatch: elapsed time (counts up from 0)
  //   - countdown: remaining time (counts down from totalCountdownSeconds)
  //   - none: always 0 (not displayed)
  const [seconds, setSeconds] = useState(
    resolvedTimerMode === 'countdown' ? totalCountdownSeconds : 0
  );
  const [isActive, setIsActive] = useState(true);
  const timerMode = resolvedTimerMode;

  // Store user's selected choice per question index
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [userNotes, setUserNotes] = useState<Record<number, string>>({});

  // Flag state per question index
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);

  // Warning system
  const [firedWarnings, setFiredWarnings] = useState<Set<WarningKey>>(new Set());
  const [activeWarning, setActiveWarning] = useState<WarningConfig | null>(null);

  // Time's Up modal (auto-submit)
  const [showTimesUpModal, setShowTimesUpModal] = useState(false);

  // Use a ref to allow handleFinalSubmit to read `seconds` without stale closure issues
  const secondsRef = useRef(seconds);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);

  const selectedAnswersRef = useRef(selectedAnswers);
  useEffect(() => { selectedAnswersRef.current = selectedAnswers; }, [selectedAnswers]);

  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);

  const currentProb = problems[currentIndex];

  // ── Timer interval ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerMode === 'none' || !isActive || !currentProb) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (timerMode === 'countdown') {
          const next = prev - 1;

          // Check warning thresholds (deferred to avoid setState-in-setState)
          setTimeout(() => {
            setFiredWarnings((fired) => {
              const newFired = new Set(fired);
              for (const w of WARNINGS) {
                if (!fired.has(w.key) && w.shouldFire(next, totalCountdownSeconds)) {
                  newFired.add(w.key);
                  if (next > 0) {
                    // Show warning modal for non-zero remaining time
                    setActiveWarning(w);
                  }
                }
              }
              return newFired;
            });

            // Auto-submit at 0
            if (next <= 0 && !isSubmittingRef.current) {
              setShowTimesUpModal(true);
            }
          }, 0);

          return Math.max(0, next);
        } else {
          // stopwatch
          return prev + 1;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerMode, isActive, currentProb, totalCountdownSeconds]);

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
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  // Evaluate accuracy and finish session attempt
  const handleFinalSubmit = async (overrideAnswers?: Record<number, string>) => {
    // ── 1. Freeze the timer and lock in the elapsed time immediately ──────────
    setIsActive(false);
    setIsSubmitting(true);

    // For stopwatch: finalSeconds = elapsed. For countdown: elapsed = total - remaining
    const snapshotSeconds = secondsRef.current;
    const finalSeconds =
      timerMode === 'countdown'
        ? totalCountdownSeconds - snapshotSeconds
        : snapshotSeconds;

    const answersToGrade = overrideAnswers ?? selectedAnswersRef.current;

    // ── 2. Grade everything locally — pure JS, no network ────────────────────
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

    // ── 3. Fire ALL DB work in the background — nothing blocks navigation ─────
    if (!activeSessionId) {
      startExerciseSessionAction(targetExId, outlineId, timerMode !== 'none')
        .then((res) => {
          if (res?.sessionId) {
            finishExerciseSessionAction(res.sessionId, correctCount, totalCount, finalSeconds).catch(console.error);
          }
        })
        .catch(console.error);
      setIsSubmitting(false);
      setShowLeaveModal(false);
      setShowTimesUpModal(false);
      toast('Exercise Submitted!', `Finished with ${correctCount}/${totalCount} correct answers.`, 'success');
      router.push(`/projects/${slug}?sub=${outlineId}`);
      return;
    }

    // Normal path: sessionId already exists from lobby
    finishExerciseSessionAction(activeSessionId, correctCount, totalCount, finalSeconds).catch(console.error);
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

    // ── 4. Navigate immediately — all score data travels in URL params ────────
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
    router.push(`/projects/${slug}/outlines/${outlineId}/exercise/${targetExId}/review/${activeSessionId}?${reviewParams.toString()}`);
  };

  const handleAbandonExercise = () => {
    setShowLeaveModal(false);
    toast('Exercise Abandoned', 'Session left without logging score.', 'info');
    router.push(`/projects/${slug}?sub=${outlineId}`);
  };

  let parsedOptions: string[] = [];
  if (currentProb.problem_type === 'multiple_choice' && currentProb.options_json) {
    try { parsedOptions = JSON.parse(currentProb.options_json); } catch (e) {}
  }

  const currentSelected = selectedAnswers[currentIndex] || null;
  const answeredCount = Object.keys(selectedAnswers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;

  // Determine if countdown is critically low (≤5 min)
  const isCountdownCritical = timerMode === 'countdown' && seconds <= 300 && seconds > 0;
  const isCountdownWarning = timerMode === 'countdown' && seconds <= 900 && seconds > 300;

  const getSquareButtonStyle = (pIdx: number) => {
    const isCurrent = pIdx === currentIndex;
    const isFlagged = Boolean(flaggedQuestions[pIdx]);
    const isAnswered = Boolean(selectedAnswers[pIdx]);

    if (isCurrent) {
      return 'bg-violet-600 text-white shadow-md shadow-violet-600/30 ring-2 ring-violet-400 scale-105 z-10 font-black';
    }
    if (isFlagged) {
      return 'bg-amber-400 text-amber-950 font-black border border-amber-500 hover:bg-amber-300 dark:bg-amber-400 dark:text-slate-950 shadow-xs';
    }
    if (isAnswered) {
      return 'bg-emerald-500 text-white font-bold border border-emerald-600 hover:bg-emerald-400 dark:bg-emerald-600 shadow-xs';
    }
    return 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Light Theme Header & Timer Bar */}
      <Breadcrumb items={breadcrumbs} />
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-m3-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Breadcrumb & Leave Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLeaveModal(true)}
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

        {/* Timer Display & Question Count & Navigation Indicator */}
        <div className="flex items-center gap-2.5">
          {/* Stopwatch display */}
          {timerMode === 'stopwatch' && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-mono text-xs font-bold">
              <Clock className="w-3.5 h-3.5 text-violet-600 animate-pulse" />
              <span>{formatSecondsToHHMMSS(seconds)}</span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className="ml-1 text-violet-500 hover:text-violet-700"
                title={isActive ? 'Pause timer' : 'Resume timer'}
              >
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
              <AlarmClock className={`w-3.5 h-3.5 ${
                isCountdownCritical ? 'text-rose-600 animate-pulse' : isCountdownWarning ? 'text-amber-500' : 'text-slate-500'
              }`} />
              <span>{formatSecondsToHHMMSS(seconds)}</span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`ml-1 ${isCountdownCritical ? 'text-rose-500 hover:text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}
                title={isActive ? 'Pause countdown' : 'Resume countdown'}
              >
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
            title="Open Question Navigation Menu"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-violet-600" />
            <span>Question Navigation ({answeredCount}/{problems.length})</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Current Question Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 space-y-6">
        
        {/* Question Card Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-2xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200/60 text-violet-600 font-black text-xs flex items-center justify-center font-mono">
              #{currentIndex + 1}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {currentProb.problem_type.replace('_', ' ')}
            </span>
            <span className="text-xs text-amber-500 font-bold font-mono">
              Diff {currentProb.difficulty}/5
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Flag Question Button */}
            <button
              type="button"
              onClick={() => toggleFlag(currentIndex)}
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                flaggedQuestions[currentIndex]
                  ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-300 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40'
              }`}
              title={flaggedQuestions[currentIndex] ? 'Unflag Question' : 'Flag Question for Review'}
            >
              <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentIndex] ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{flaggedQuestions[currentIndex] ? 'Flagged' : 'Flag Question'}</span>
            </button>

            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Question {currentIndex + 1} of {problems.length}
            </span>
          </div>
        </div>

        {/* Problem Statement Box */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
          <MathRenderer content={currentProb.problem_statement} />
        </div>

        {/* Options List for Multiple Choice */}
        {currentProb.problem_type === 'multiple_choice' && parsedOptions.length > 0 && (
          <div className="space-y-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Select Your Answer Choice
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parsedOptions.map((optText, oIdx) => {
                const isSelected = currentSelected === optText;
                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleOptionSelect(optText)}
                    className={`p-4 rounded-2xl border text-xs text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-violet-50 dark:bg-violet-950/60 border-2 border-violet-600 text-violet-950 dark:text-violet-100 font-bold shadow-md shadow-violet-600/10'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-100/60'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    <div className="flex-1">
                      <MathRenderer content={optText} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes / Derivation Steps Input for Essay or Calculation */}
        {currentProb.problem_type !== 'multiple_choice' && (
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Your Answer / Derivation Notes (LaTeX supported)
            </label>
            <textarea
              rows={4}
              value={userNotes[currentIndex] || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Write your answer, steps, or final numeric calculation here..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
            />
          </div>
        )}

        {/* Standard Navigation Bar (Previous, Next, Submit) */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handlePrevQuestion}
            disabled={currentIndex === 0}
            className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-3">
            {currentIndex < problems.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-6 py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFinalSubmit()}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-600/30 disabled:opacity-50 m3-ripple"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                <span>{isSubmitting ? 'Submitting…' : 'Submit Exercise'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Question Navigation Modal Grid Popup ─────────────────────────────── */}
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
              <button
                onClick={() => setShowNavModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold px-1 py-1 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-violet-600 shadow-xs" />
                <span>Current ({currentIndex + 1})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-500 border border-emerald-600" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-400 border border-amber-500" />
                <span>Flagged ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
                <span>Unanswered ({problems.length - answeredCount})</span>
              </div>
            </div>

            {/* Question Grid */}
            <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 font-mono text-xs">
                {problems.map((p, pIdx) => {
                  const isCurrent = pIdx === currentIndex;
                  const isFlagged = Boolean(flaggedQuestions[pIdx]);
                  const isAnswered = Boolean(selectedAnswers[pIdx]);

                  return (
                    <button
                      key={p.id || pIdx}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(pIdx);
                        setShowNavModal(false);
                      }}
                      className={`h-10 rounded-xl flex items-center justify-center gap-1 transition-all relative ${getSquareButtonStyle(pIdx)}`}
                      title={`Go to Question ${pIdx + 1}${isFlagged ? ' (Flagged)' : ''}${isAnswered ? ' (Answered)' : ''}`}
                    >
                      <span>Q{pIdx + 1}</span>
                      {isFlagged ? (
                        <Flag className="w-3 h-3 fill-amber-950 text-amber-950" />
                      ) : isAnswered && !isCurrent ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNavModal(false)}
                className="px-5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all"
              >
                Close Navigation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Leave Modal ───────────────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Leave Exercise Session?</h3>
              </div>
              <button onClick={() => setShowLeaveModal(false)} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You are currently in an active exercise session. What would you like to do with your attempt?
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleFinalSubmit()}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                <span>{isSubmitting ? 'Submitting…' : 'Submit'}</span>
              </button>

              <button
                type="button"
                onClick={handleAbandonExercise}
                className="w-full py-3 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200/80 font-bold text-xs transition-all"
              >
                Abandon
              </button>

              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 transition-all"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mid-session Warning Modal (50% / 15min / 5min) ───────────────────── */}
      {activeWarning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 ${
            activeWarning.urgency === 'rose'
              ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-700'
              : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${
                activeWarning.urgency === 'rose'
                  ? 'bg-rose-100 dark:bg-rose-900'
                  : 'bg-amber-100 dark:bg-amber-900'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  activeWarning.urgency === 'rose' ? 'text-rose-600' : 'text-amber-600'
                }`} />
              </div>
              <h3 className={`text-sm font-black ${
                activeWarning.urgency === 'rose'
                  ? 'text-rose-900 dark:text-rose-100'
                  : 'text-amber-900 dark:text-amber-100'
              }`}>
                {activeWarning.title}
              </h3>
            </div>

            <p className={`text-xs leading-relaxed ${
              activeWarning.urgency === 'rose'
                ? 'text-rose-800 dark:text-rose-200'
                : 'text-amber-800 dark:text-amber-200'
            }`}>
              {activeWarning.message}
            </p>

            {timerMode === 'countdown' && (
              <div className={`font-mono text-2xl font-black text-center py-2 ${
                activeWarning.urgency === 'rose' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'
              }`}>
                {formatSecondsToHHMMSS(seconds)}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveWarning(null)}
              className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${
                activeWarning.urgency === 'rose'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
              }`}
            >
              Got it — Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Time's Up Modal (auto-submit) ─────────────────────────────────────── */}
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

            <button
              type="button"
              onClick={() => handleFinalSubmit()}
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
              <span>{isSubmitting ? 'Submitting…' : 'View Results'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
