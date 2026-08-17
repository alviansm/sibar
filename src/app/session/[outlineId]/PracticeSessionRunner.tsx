'use client';

import React, { useState, useEffect } from 'react';
import { logAttemptAction } from '@/app/actions/session';
import { MathRenderer } from '@/components/MathRenderer';
import { formatSecondsToHHMMSS } from '@/lib/utils';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Flame,
  Award,
  Loader2,
  FileText,
  Timer,
  RefreshCw,
  Eye,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

import { finishExerciseSessionAction } from '@/app/actions/exercise';

interface PracticeSessionRunnerProps {
  outlineId: string;
  slug: string;
  problems: any[];
  sessionId?: string;
}

export const PracticeSessionRunner: React.FC<PracticeSessionRunnerProps> = ({
  outlineId,
  slug,
  problems,
  sessionId,
}) => {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isTimed, setIsTimed] = useState(true);

  const [showHint, setShowHint] = useState(false);
  const [isSurrendered, setIsSurrendered] = useState(false);
  const [frictionScore, setFrictionScore] = useState(2);
  const [userNotes, setUserNotes] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<any | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const [attemptHistory, setAttemptHistory] = useState<
    {
      problem: any;
      selectedOption: string | null;
      isCorrect: boolean;
      timeSpent: number;
    }[]
  >([]);

  const [isReviewingMode, setIsReviewingMode] = useState(false);

  const currentProb = problems[currentIndex];

  // Stopwatch timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTimed && isActive && !isCompleted && currentProb) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          if (next === 300) {
            toast('Stopwatch Alert', '5 minutes elapsed on current problem rep.', 'timer', 5000);
          } else if (next === 600) {
            toast('Stopwatch Alert', '10 minutes elapsed. Consider taking a hint if stuck.', 'timer', 5000);
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimed, isActive, isCompleted, currentProb, toast]);

  if (!currentProb || problems.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
        <Sparkles className="w-10 h-10 text-indigo-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Problems in this Subchapter</h2>
        <p className="text-sm text-slate-400">
          Add problems to this subchapter using the Problem Set Manager before starting a practice session.
        </p>
        <Link
          href={`/projects/${slug}?sub=${outlineId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Workspace
        </Link>
      </div>
    );
  }

  const handleResetTimer = () => {
    setSeconds(0);
    setIsActive(true);
  };

  const handleToggleTimer = () => {
    setIsActive(!isActive);
  };

  const handleSurrender = async () => {
    setIsSurrendered(true);
    setShowHint(true);
    toast('Surrendered', 'Reference solution key revealed.', 'warning');
  };

  const handleRetakeExercise = () => {
    setCurrentIndex(0);
    setSeconds(0);
    setIsActive(true);
    setShowHint(false);
    setIsSurrendered(false);
    setSubmittedFeedback(null);
    setUserNotes('');
    setSelectedOption(null);
    setIsCompleted(false);
    setIsReviewingMode(false);
    setAttemptHistory([]);
    toast('Exercise Reset', 'Starting retake for this exercise problem set.', 'info');
  };

  const handleSubmitAttempt = async (forcedOutcome?: 'clean_solve' | 'solved_with_hint' | 'surrendered') => {
    setIsSubmitting(true);
    setSubmittedFeedback(null);

    let parsedOpts: string[] = [];
    if (currentProb.problem_type === 'multiple_choice' && currentProb.options_json) {
      try {
        parsedOpts = JSON.parse(currentProb.options_json);
      } catch (e) {}
    }

    let isMcqCorrect = true;
    if (currentProb.problem_type === 'multiple_choice') {
      let correctIndices: number[] = [];
      if (currentProb.correct_option_indices) {
        try {
          correctIndices = JSON.parse(currentProb.correct_option_indices);
        } catch (e) {}
      } else if (typeof currentProb.correct_option_index === 'number') {
        correctIndices = [currentProb.correct_option_index];
      }

      const chosenIndices = (selectedOption ? [selectedOption] : [])
        .map((opt) => parsedOpts.indexOf(opt))
        .filter((idx) => idx !== -1)
        .sort((a, b) => a - b);

      if (correctIndices.length > 0) {
        isMcqCorrect =
          chosenIndices.length === correctIndices.length &&
          chosenIndices.every((val, idx) => val === correctIndices[idx]);
      }
    }

    const outcome = forcedOutcome || (!isMcqCorrect || isSurrendered ? 'surrendered' : showHint ? 'solved_with_hint' : 'clean_solve');

    // Track attempt history for grading ratio
    const currentIsCorrect = outcome === 'clean_solve' || outcome === 'solved_with_hint';
    setAttemptHistory((prev) => [
      ...prev,
      {
        problem: currentProb,
        selectedOption,
        isCorrect: currentIsCorrect,
        timeSpent: seconds,
      },
    ]);

    const res = await logAttemptAction(
      currentProb.id,
      outlineId,
      seconds,
      outcome,
      frictionScore,
      selectedOption ? `Selected Choice: ${selectedOption}\nNotes: ${userNotes}` : userNotes
    );

    setIsSubmitting(false);

    if (res.error) {
      toast('Error Logging Attempt', res.error, 'error');
      return;
    }

    if (currentIsCorrect) {
      toast('Correct Answer!', `Clean solve logged in ${formatSecondsToHHMMSS(seconds)}.`, 'success');
    } else if (outcome === 'surrendered' && !isMcqCorrect) {
      toast('Incorrect Answer', 'Choice was wrong. Solution key revealed below.', 'error');
      setShowHint(true);
    }

    if (res.aiFeedback) {
      setSubmittedFeedback(res.aiFeedback);
    }

    if (currentIndex + 1 < problems.length) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSeconds(0);
        setShowHint(false);
        setIsSurrendered(false);
        setSubmittedFeedback(null);
        setUserNotes('');
        setSelectedOption(null);
      }, 2500);
    } else {
      setIsCompleted(true);
      if (sessionId) {
        const fullHistory = [
          ...attemptHistory,
          { problem: currentProb, selectedOption, isCorrect: currentIsCorrect, timeSpent: seconds },
        ];
        const correctCount = fullHistory.filter((h) => h.isCorrect).length;
        await finishExerciseSessionAction(sessionId, correctCount, problems.length, seconds);
      }
      toast('Session Complete!', 'Exercise problem set finished.', 'success', 6000);
    }
  };

  let parsedOptions: string[] = [];
  if (currentProb.problem_type === 'multiple_choice' && currentProb.options_json) {
    try {
      parsedOptions = JSON.parse(currentProb.options_json);
    } catch {}
  }

  // Calculate grading ratio
  const correctCount = attemptHistory.filter((a) => a.isCorrect).length;
  const totalCount = attemptHistory.length || problems.length;
  const percentage = Math.round((correctCount / Math.max(1, totalCount)) * 100);

  return (
    <div className="space-y-6">
      
      {/* Stopwatch & Telemetry Bar */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Step Indicator */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold uppercase px-3 py-1 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
            Rep {currentIndex + 1} of {problems.length}
          </span>
          <span className="text-xs font-mono text-amber-400 font-bold">
            Difficulty {currentProb.difficulty}/5
          </span>
        </div>

        {/* Real-time Stopwatch Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTimed(!isTimed)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isTimed
                ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isTimed ? 'Timed Mode' : 'Untimed Practice'}
          </button>

          {isTimed && (
            <div className="flex items-center gap-4 bg-slate-950/80 px-5 py-2.5 rounded-2xl border border-slate-800">
              <Timer className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span className="font-mono text-2xl font-black text-white tracking-widest">
                {formatSecondsToHHMMSS(seconds)}
              </span>
              <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                <button
                  onClick={handleToggleTimer}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title={isActive ? 'Pause Timer' : 'Start Timer'}
                >
                  {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleResetTimer}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Completion Dashboard: Score Ratio + Review & Retake Options */}
      {isCompleted ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 space-y-8 shadow-2xl animate-in zoom-in-95 duration-300">
          
          <div className="text-center space-y-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto border ${
              percentage >= 80
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : percentage >= 50
                ? 'bg-amber-950 text-amber-400 border-amber-800'
                : 'bg-rose-950 text-rose-400 border-rose-800'
            }`}>
              <Award className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Exercise Session Completed!</h2>
              {/* Grading System Ratio */}
              <div className="text-3xl font-black font-mono text-white tracking-tight">
                Score: <span className={percentage >= 80 ? 'text-emerald-400' : percentage >= 50 ? 'text-amber-400' : 'text-rose-400'}>{correctCount} / {totalCount}</span> ({percentage}%)
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Ratio of correct answers evaluated. Telemetry logged into your study archive.
              </p>
            </div>

            {/* Actions: Dedicated Review Page, Retake, Return */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              {sessionId && (
                <Link
                  href={`/projects/${slug}/outlines/${outlineId}/exercise/${currentProb?.exercise_id || problems[0]?.exercise_id || outlineId}/review/${sessionId}`}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all m3-ripple"
                >
                  <Eye className="w-4 h-4 text-white" />
                  <span>Open Anti-Spoiler Review Page</span>
                </Link>
              )}

              <button
                onClick={() => setIsReviewingMode(!isReviewingMode)}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all"
              >
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>{isReviewingMode ? 'Hide Inline Review' : 'Inline Quick Review'}</span>
              </button>

              <button
                onClick={handleRetakeExercise}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Retake Exercise Set</span>
              </button>

              <Link
                href={`/projects/${slug}?sub=${outlineId}`}
                className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all"
              >
                <span>Return to Workspace</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Exercise Review Question Breakdown */}
          {isReviewingMode && (
            <div className="space-y-4 pt-6 border-t border-slate-800 animate-in fade-in duration-200">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Exercise Question-by-Question Review
              </h3>
              <div className="space-y-4">
                {attemptHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-400">Question #{idx + 1}</span>
                      {item.isCorrect ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                          <Check className="w-4 h-4" /> Correct Answer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-400">
                          <X className="w-4 h-4" /> Incorrect Answer
                        </span>
                      )}
                    </div>

                    <MathRenderer content={item.problem.problem_statement} />

                    {item.selectedOption && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                        <span className="font-semibold text-slate-400">Your Choice: </span>
                        <MathRenderer content={item.selectedOption} />
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/60 space-y-1 text-slate-300">
                      <span className="font-bold text-indigo-300">Solution Guide:</span>
                      <MathRenderer content={item.problem.solution_guide} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Active Problem Workspace */
        <div className="space-y-6">
          
          {/* Statement Render Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Problem Statement ({currentProb.problem_type.replace('_', ' ')})
            </span>
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-white text-base">
              <MathRenderer content={currentProb.problem_statement} />
            </div>

            {/* MCQ Options Rendering */}
            {currentProb.problem_type === 'multiple_choice' && parsedOptions.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Option</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parsedOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedOption(opt)}
                      className={`p-4 rounded-2xl border text-left text-xs font-semibold transition-all ${
                        selectedOption === opt
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <MathRenderer content={opt} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Row: Hint / Surrender / Friction Scale */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
            
            {/* Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-2 transition-colors border border-amber-500/20"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{showHint ? 'Hide Hint' : 'Need Hint'}</span>
                </button>

                <button
                  onClick={handleSurrender}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-semibold flex items-center gap-2 transition-colors border border-rose-500/20"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Surrender & Show Key</span>
                </button>
              </div>

              {/* Friction Rating Scale */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cognitive Friction (1-5):</span>
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => setFrictionScore(score)}
                      className={`w-8 h-8 rounded-xl font-mono font-bold text-xs transition-all ${
                        frictionScore === score
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 scale-105'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Revealed Hint / Solution Drawer */}
            {(showHint || isSurrendered) && (
              <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-sm space-y-3 animate-in fade-in duration-200">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Reference Derivation / Key
                </span>
                <MathRenderer content={currentProb.solution_guide} />
              </div>
            )}

            {/* Student Scratchpad / Notes */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Derivation Notes / Answer Key for AI Grading Telemetry</span>
              </label>
              <textarea
                rows={3}
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Type your derivation steps or notes here for AI feedback evaluation..."
                className="w-full p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs font-mono text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* AI Feedback Display Toast */}
            {submittedFeedback && (
              <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-800 text-xs space-y-1.5 text-indigo-200 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>AI Telemetry Coach Feedback ({submittedFeedback.correctness})</span>
                </div>
                <p className="text-slate-300 font-medium">{submittedFeedback.verdict}</p>
                <p className="text-indigo-400 italic">{submittedFeedback.suggestions}</p>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleSubmitAttempt()}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all m3-ripple disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging Rep & Telemetry...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Log Rep & Next Problem</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
