'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Timer,
  Target,
  BarChart2,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { DailyStudyTimePoint } from '@/lib/telemetry';
import { StudyTimeGraph } from '@/components/StudyTimeGraph';

interface DashboardStatsCarouselProps {
  totalReps: number;
  totalStudyTime: string;
  cleanSolveRate: number;
  dayStreak: number;
  weekStreak: number;
  totalActiveDays: number;
  isTodayActive: boolean;
  dailyStudyTimeTrend?: DailyStudyTimePoint[];
}

export const DashboardStatsCarousel: React.FC<DashboardStatsCarouselProps> = ({
  totalReps,
  totalStudyTime,
  cleanSolveRate,
  dayStreak,
  weekStreak,
  totalActiveDays,
  isTodayActive,
  dailyStudyTimeTrend = [],
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const totalSlides = 3;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getSlideTitle = () => {
    switch (currentSlide) {
      case 0:
        return 'Habit & Consistency Streaks';
      case 1:
        return 'Study Time Activity Graph';
      case 2:
        return 'Study Performance Telemetry';
      default:
        return 'Study Metrics';
    }
  };

  return (
    <div className="space-y-3">
      {/* Carousel Top Navigation Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {getSlideTitle()}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
            {currentSlide + 1} / {totalSlides}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/stats"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors mr-2"
          >
            <span>Full Stats &amp; Calendar</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5 mr-1">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  currentSlide === idx
                    ? 'w-6 bg-indigo-600 dark:bg-indigo-500'
                    : 'w-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Prev/Next Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={prevSlide}
              aria-label="Previous Slide"
              className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition-all active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next Slide"
              className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm transition-all active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Container with Unified Equal Height & Animation */}
      <div className="relative overflow-hidden min-h-[140px]">
        {currentSlide === 0 ? (
          /* Slide 1 (1st): Habit & Consistency Streaks */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
            {/* Card 1: Daily Streak */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5 hover:shadow-m3-2 transition-all min-h-[140px]">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800 flex-shrink-0">
                <Flame className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daily Study Streak</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {dayStreak} <span className="text-xs font-normal text-slate-500">days</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  {isTodayActive ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Today complete!</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Finish a rep today to continue</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Card 2: Weekly Streak */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5 hover:shadow-m3-2 transition-all min-h-[140px]">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800 flex-shrink-0">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Weekly Streak</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {weekStreak} <span className="text-xs font-normal text-slate-500">weeks</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Consistent study weeks</span>
                </p>
              </div>
            </div>

            {/* Card 3: Total Active Days */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5 hover:shadow-m3-2 transition-all min-h-[140px]">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/60 dark:border-teal-800 flex-shrink-0">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Active Days</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {totalActiveDays} <span className="text-xs font-normal text-slate-500">days</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-teal-500" />
                  <span>Lifetime practice sessions</span>
                </p>
              </div>
            </div>
          </div>
        ) : currentSlide === 1 ? (
          /* Slide 2 (2nd): Study Time Activity Graph */
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-[140px]">
            <StudyTimeGraph data={dailyStudyTimeTrend} variant="compact" />
          </div>
        ) : (
          /* Slide 3 (3rd): Study Performance Telemetry */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Card 1: Solved Reps */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5 hover:shadow-m3-2 transition-all min-h-[140px]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800 flex-shrink-0">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Solved Reps</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {totalReps} <span className="text-xs font-normal text-slate-500">reps</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Clean derivations &amp; solutions</span>
                </p>
              </div>
            </div>

            {/* Card 2: Study Hours */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5 hover:shadow-m3-2 transition-all min-h-[140px]">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-800 flex-shrink-0">
                <Timer className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Study Time</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                  {totalStudyTime}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>Logged practice stopwatch</span>
                </p>
              </div>
            </div>

            {/* Card 3: Clean Solve Rate */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5 hover:shadow-m3-2 transition-all min-h-[140px]">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800 flex-shrink-0">
                <Target className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clean Solve Rate</span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {cleanSolveRate}%
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>First-attempt solve ratio</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
