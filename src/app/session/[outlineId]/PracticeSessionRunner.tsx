'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

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
  initialIsTimed?: boolean;
}

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
  initialIsTimed = true,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    childPage: 'Practice Session',
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isTimed, setIsTimed] = useState(initialIsTimed);

  // Store user's selected choice per question index: { 0: "Option text", 1: "Option text" }
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [userNotes, setUserNotes] = useState<Record<number, string>>({});

  // Flag state per question index
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showNavModal, setShowNavModal] = useState(false);

  const currentProb = problems[currentIndex];

  // Stopwatch timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTimed && isActive && currentProb) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimed, isActive, currentProb]);

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
      setCurrentIndex((prev) => prev - 1 + 1 + 1 - 1 + 1);
    }
  };

  // Evaluate accuracy and finish session attempt
  const handleFinalSubmit = async () => {
    // ── 1. Freeze the timer and lock in the elapsed time immediately ──────────
    setIsActive(false);
    const finalSeconds = seconds; // snapshot before any await
    setIsSubmitting(true);

    // ── 2. Grade everything locally — pure JS, no network ────────────────────
    const gradedProblems = problems.map((prob, i) => {
      const selected = selectedAnswers[i] || null;

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
      // Rare path: no pre-created session (lobby always creates one, but be safe)
      startExerciseSessionAction(targetExId, outlineId, isTimed)
        .then((res) => {
          if (res?.sessionId) {
            finishExerciseSessionAction(res.sessionId, correctCount, totalCount, finalSeconds).catch(console.error);
          }
        })
        .catch(console.error);
      // Can't navigate to a proper review URL without an ID, so fall back
      setIsSubmitting(false);
      setShowLeaveModal(false);
      toast('Exercise Submitted!', `Finished with ${correctCount}/${totalCount} correct answers.`, 'success');
      router.push(`/projects/${slug}?sub=${outlineId}`);
      return;
    }

    // Normal path: sessionId already exists from lobby
    // Fire everything as background tasks — do NOT await
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
    toast('Exercise Submitted!', `Finished with ${correctCount}/${totalCount} correct answers.`, 'success');

    const encodedAnswers = btoa(encodeURIComponent(JSON.stringify(selectedAnswers)));
    const params = new URLSearchParams({
      answers: encodedAnswers,
      score: String(scorePct),
      correct: String(correctCount),
      total: String(totalCount),
      dur: String(finalSeconds),
      timed: isTimed ? '1' : '0',
    });
    router.push(`/projects/${slug}/outlines/${outlineId}/exercise/${targetExId}/review/${activeSessionId}?${params.toString()}`);
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

        {/* Stopwatch & Question Count & Navigation Indicator */}
        <div className="flex items-center gap-2.5">
          {isTimed && (
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
                onClick={handleFinalSubmit}
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

      {/* Question Navigation Modal Grid Popup */}
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
                      className={`h-10 rounded-xl flex items-center justify-center gap-1 transition-all relative ${getSquareButtonStyle(
                        pIdx
                      )}`}
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

      {/* Confirm Leave Modal */}
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
                onClick={handleFinalSubmit}
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
    </div>
  );
};

