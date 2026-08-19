'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Flame,
  Calendar as CalendarIcon,
  CheckCircle2,
  Trophy,
  BookOpen,
  Target,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Activity,
  Award,
  ArrowRight,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { TelemetryOverviewData, FormattedDayActivity } from '@/lib/telemetry';
import { getDayActivitiesAction } from '@/app/actions/telemetry';
import { StudyTimeGraph } from '@/components/StudyTimeGraph';
import Link from 'next/link';

interface StatsWorkspaceProps {
  initialOverview: TelemetryOverviewData;
  initialSelectedDate?: string;
  initialDayActivities?: FormattedDayActivity[];
}

export function StatsWorkspace({
  initialOverview,
  initialSelectedDate,
  initialDayActivities = [],
}: StatsWorkspaceProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate || todayStr);
  const [dayActivities, setDayActivities] = useState<FormattedDayActivity[]>(initialDayActivities);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Active dates set for fast lookup
  const activeDatesSet = new Set(initialOverview.activeDates || []);

  // Fetch activities when selectedDate changes
  useEffect(() => {
    let isCancelled = false;
    async function loadActivities() {
      setIsActivitiesLoading(true);
      try {
        const res = await getDayActivitiesAction(selectedDate);
        if (!isCancelled && res.success && res.activities) {
          setDayActivities(res.activities);
        }
      } catch (err) {
        console.error('Error loading day activities:', err);
      } finally {
        if (!isCancelled) setIsActivitiesLoading(false);
      }
    }

    loadActivities();
    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  // Calendar matrix calculation
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday, ...
    return new Date(year, month, 1).getDay();
  };

  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth); // 0 (Sun) to 6 (Sat)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  // Activity category icon helper
  const getActivityIcon = (category: string, activityType: string) => {
    if (activityType.includes('concept')) {
      return <BookOpen className="w-4 h-4 text-emerald-500" />;
    }
    if (activityType.includes('exercise')) {
      return <Trophy className="w-4 h-4 text-amber-500" />;
    }
    if (activityType.includes('problem') || activityType.includes('example')) {
      return <Target className="w-4 h-4 text-indigo-500" />;
    }
    if (category === 'workspace') {
      return <Layers className="w-4 h-4 text-sky-500" />;
    }
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  // Format date display
  const formatFriendlyDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Stats Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Habit &amp; Telemetry Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Study Statistics &amp; Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Keep your momentum alive. Complete concepts, worked examples, and exercises to maintain daily streaks and track cognitive growth.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white/10 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-3 px-4 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black leading-none">
                {initialOverview.activeStreakDays}{' '}
                <span className="text-xs font-normal text-slate-300">Days</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                Current Day Streak
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/10 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-3 px-4 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black leading-none">
                {initialOverview.activeStreakWeeks || 0}{' '}
                <span className="text-xs font-normal text-slate-300">Weeks</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                Weekly Streak
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-m3-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800 flex-shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Mastered Concepts</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialOverview.conceptsMasteredCount}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-m3-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800 flex-shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Problem Reps Solved</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialOverview.problemsSolvedCount}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-m3-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800 flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Exercises Finished</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialOverview.exercisesCompletedCount}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-m3-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-800 flex-shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Active Days</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {initialOverview.totalActiveDays}{' '}
              <span className="text-xs font-medium text-slate-400">days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Study Velocity & Deliberate Practice Time Graph */}
      <StudyTimeGraph
        data={initialOverview.dailyStudyTimeTrend || []}
        variant="detailed"
      />

      {/* Main Section: Interactive Calendar View + Day Activities Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left/Main Column: Calendar View (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 space-y-6">
          
          {/* Calendar Header Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Checkmark indicates active study completion day
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                aria-label="Previous Month"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                aria-label="Next Month"
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
              {dayNames.map((d, i) => (
                <div key={d} className={i === 0 || i === 6 ? 'text-slate-400/80' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days Cells Grid */}
            <div className="grid grid-cols-7 gap-2 pt-1">
              {/* Blank offset placeholders for days before 1st of month */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`blank-${i}`} className="h-16 sm:h-20 rounded-2xl bg-slate-50/40 dark:bg-slate-950/20 border border-transparent" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isActiveDay = activeDatesSet.has(cellDateStr);
                const isSelected = selectedDate === cellDateStr;
                const isCurrentToday = todayStr === cellDateStr;

                return (
                  <button
                    key={cellDateStr}
                    onClick={() => setSelectedDate(cellDateStr)}
                    className={`h-16 sm:h-20 rounded-2xl p-1.5 sm:p-2.5 flex flex-col justify-between items-start transition-all relative group text-left border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 scale-[1.03] z-10'
                        : isActiveDay
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {/* Top Row: Day Number & Today indicator */}
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isSelected
                            ? 'text-white'
                            : isCurrentToday
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {isCurrentToday && (
                        <span
                          className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                          }`}
                        >
                          Today
                        </span>
                      )}
                    </div>

                    {/* Bottom Indicator: Active Checkmark if Active Day */}
                    <div className="w-full flex items-center justify-end">
                      {isActiveDay ? (
                        <div
                          className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/80'
                          }`}
                          title="Active Study Day: Concept/Problem/Exercise Completed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Active</span>
                        </div>
                      ) : (
                        <div className="h-3.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar Legend */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" />
              </div>
              <span>Active Study Day (Checkmarked)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-indigo-600" />
              <span>Selected Day</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-indigo-400" />
              <span>Current Date</span>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Day Activity Details (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Selected Day Breakdown
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {formatFriendlyDate(selectedDate)}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              {activeDatesSet.has(selectedDate) ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active Day</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500">
                  <span>No checkmark</span>
                </span>
              )}
            </div>
          </div>

          {/* Activities List */}
          <div className="space-y-3">
            {isActivitiesLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading activities...</span>
              </div>
            ) : dayActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl p-6">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No learning activities logged for this day.
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Complete a Concept, Worked Example, or Exercise in your projects to checkmark this day.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {dayActivities.map((act) => {
                  const actTime = new Date(act.created_at * 1000).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={act.id}
                      className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4 space-y-2 transition-all hover:border-indigo-300 dark:hover:border-indigo-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mt-0.5 flex-shrink-0">
                            {getActivityIcon(act.category, act.activity_type)}
                          </div>
                          <div className="min-w-0">
                            {/* Activity Title and Context: Activity Name (Exercise/Concept - Subchapter - Workspace) */}
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                              {act.title}
                            </h4>
                            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                              {act.formattedContext}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 whitespace-nowrap">
                          {actTime}
                        </span>
                      </div>

                      {act.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-8">
                          {act.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Action Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <span>Go to Study Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <span className="text-[11px] text-slate-400 font-mono">
              {dayActivities.length} {dayActivities.length === 1 ? 'record' : 'records'} logged
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
