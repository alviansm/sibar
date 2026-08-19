'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  Flame,
  Calendar,
  Layers,
  BookOpen,
  Target,
  Award,
  TrendingUp,
  Info,
} from 'lucide-react';
import { DailyStudyTimePoint } from '@/lib/telemetry';

interface StudyTimeGraphProps {
  data: DailyStudyTimePoint[];
  variant?: 'compact' | 'detailed';
  title?: string;
  subtitle?: string;
}

type TimeRange = '7d' | '14d' | '30d';
type CategoryFilter = 'all' | 'concept' | 'problem' | 'exercise';

export const StudyTimeGraph: React.FC<StudyTimeGraphProps> = ({
  data = [],
  variant = 'detailed',
  title = 'Study Time & Deliberate Practice Progression',
  subtitle = 'Track time spent reading & writing concepts, worked problem reps, and exercise workouts.',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>(variant === 'compact' ? '7d' : '14d');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [activeTooltipIdx, setActiveTooltipIdx] = useState<number | null>(null);

  // Slice data according to selected time range
  const filteredDays = useMemo(() => {
    if (!data || data.length === 0) return [];
    const count = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
    return data.slice(-count);
  }, [data, timeRange]);

  // Compute summary metrics for the selected time range
  const metrics = useMemo(() => {
    let totalSec = 0;
    let conceptSec = 0;
    let problemSec = 0;
    let exerciseSec = 0;
    let maxSec = 0;
    let peakDay = '';

    filteredDays.forEach((day) => {
      let dayVal = 0;
      if (categoryFilter === 'all') {
        dayVal = day.totalSeconds;
        conceptSec += day.conceptSeconds;
        problemSec += day.problemSeconds;
        exerciseSec += day.exerciseSeconds;
      } else if (categoryFilter === 'concept') {
        dayVal = day.conceptSeconds;
        conceptSec += day.conceptSeconds;
      } else if (categoryFilter === 'problem') {
        dayVal = day.problemSeconds;
        problemSec += day.problemSeconds;
      } else if (categoryFilter === 'exercise') {
        dayVal = day.exerciseSeconds;
        exerciseSec += day.exerciseSeconds;
      }

      totalSec += dayVal;
      if (dayVal > maxSec) {
        maxSec = dayVal;
        peakDay = day.shortLabel;
      }
    });

    const activeDaysCount = filteredDays.filter((d) => d.totalSeconds > 0).length;
    const avgMins = filteredDays.length > 0 ? Math.round((totalSec / 60 / filteredDays.length) * 10) / 10 : 0;
    const totalHours = (totalSec / 3600).toFixed(1);

    return {
      totalSec,
      totalHours,
      avgMins,
      maxSec: Math.max(maxSec, 60), // Ensure at least 1 min for chart scale
      peakDay: peakDay || 'N/A',
      conceptSec,
      problemSec,
      exerciseSec,
      activeDaysCount,
    };
  }, [filteredDays, categoryFilter]);

  const formatSeconds = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    if (mins < 60) {
      return remainingSec > 0 ? `${mins}m ${remainingSec}s` : `${mins}m`;
    }
    const hours = (mins / 60).toFixed(1);
    return `${hours}h`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPACT VARIANT (For Dashboard Carousel Slide 3)
  // ─────────────────────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    const compactDays = data.slice(-7);
    const maxVal = Math.max(...compactDays.map((d) => d.totalSeconds), 60);

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-m3-1 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 min-h-[140px]">
        {/* Left Side: Summary & Legends */}
        <div className="space-y-2 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800 flex-shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Study Time Trend
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                7-Day Deliberate Practice
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-indigo-200/70 dark:border-indigo-800">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>{formatSeconds(compactDays.reduce((acc, d) => acc + d.totalSeconds, 0))} Total</span>
            </span>

            <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-500 pl-1">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Concepts</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>Problems</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Exercises</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: 7-Day Mini Bar Columns */}
        <div className="flex-1 max-w-md w-full">
          <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-16 sm:h-20">
            {compactDays.map((day, idx) => {
              const totalSec = day.totalSeconds;
              const heightPct = Math.max(Math.round((totalSec / maxVal) * 100), totalSec > 0 ? 8 : 2);
              const conceptPct = totalSec > 0 ? (day.conceptSeconds / totalSec) * 100 : 0;
              const problemPct = totalSec > 0 ? (day.problemSeconds / totalSec) * 100 : 0;
              const exercisePct = totalSec > 0 ? (day.exerciseSeconds / totalSec) * 100 : 0;
              const isHovered = activeTooltipIdx === idx;
              const compactAlign =
                idx >= compactDays.length - 2
                  ? 'right-0 translate-x-0'
                  : idx <= 1
                  ? 'left-0 translate-x-0'
                  : 'left-1/2 -translate-x-1/2';

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-1 h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setActiveTooltipIdx(idx)}
                  onMouseLeave={() => setActiveTooltipIdx(null)}
                  onClick={() => setActiveTooltipIdx(isHovered ? null : idx)}
                >
                  {/* Floating Tooltip */}
                  {isHovered && (
                    <div
                      className={`absolute top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white text-[11px] rounded-xl py-1.5 px-2.5 shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none ${compactAlign}`}
                    >
                      <p className="font-bold text-indigo-300">{day.dayLabel}</p>
                      <p className="font-mono text-[10px] text-slate-200">
                        Total: {formatSeconds(totalSec)}
                      </p>
                    </div>
                  )}

                  {/* Stacked Bar Container */}
                  <div
                    className="w-full max-w-[26px] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex flex-col-reverse transition-all duration-300 group-hover:scale-105"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div style={{ height: `${conceptPct}%` }} className="bg-emerald-500 w-full" />
                    <div style={{ height: `${problemPct}%` }} className="bg-indigo-600 w-full" />
                    <div style={{ height: `${exercisePct}%` }} className="bg-amber-500 w-full" />
                  </div>

                  {/* Day Label */}
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {day.dayLabel.split(',')[0].slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DETAILED VARIANT (For Dedicated /stats page)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 space-y-6">
      
      {/* Top Header & Range/Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Telemetry Study Velocity</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">{subtitle}</p>
        </div>

        {/* Range Selector & Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Pills */}
          <div className="inline-flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
            {(['7d', '14d', '30d'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timeRange === r
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {r === '7d' ? '7 Days' : r === '14d' ? '14 Days' : '30 Days'}
              </button>
            ))}
          </div>

          {/* Category Filter Dropdown / Pills */}
          <div className="inline-flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700">
            {[
              { key: 'all', label: 'All Activities' },
              { key: 'concept', label: 'Concepts' },
              { key: 'problem', label: 'Problems' },
              { key: 'exercise', label: 'Exercises' },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key as CategoryFilter)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  categoryFilter === cat.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Window Study Time
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 font-mono">
            {formatSeconds(metrics.totalSec)}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {metrics.activeDaysCount} active study days
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Daily Average
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 font-mono">
            {metrics.avgMins} <span className="text-xs font-normal text-slate-500">mins/day</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Across {filteredDays.length} days</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Peak Session Day
          </span>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-1">
            {metrics.peakDay}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Max {formatSeconds(metrics.maxSec)}</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Dominant Focus
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1 truncate">
            {metrics.problemSec >= metrics.conceptSec && metrics.problemSec >= metrics.exerciseSec
              ? 'Problem Reps'
              : metrics.conceptSec >= metrics.exerciseSec
              ? 'Concepts'
              : 'Exercises'}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Highest logged practice volume</p>
        </div>
      </div>

      {/* Main Interactive Bar Chart Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
          <span>Daily Time Spent</span>
          <span>Max: {formatSeconds(metrics.maxSec)}</span>
        </div>

        {/* Scrollable Container for Mobile Responsiveness with generous top padding to prevent tooltip cut */}
        <div className="overflow-x-auto pt-6 pb-2 scrollbar-thin">
          <div
            className="min-w-[500px] h-56 sm:h-64 grid items-end gap-2 pt-20 pb-3 px-3 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-100 dark:border-slate-800 relative"
            style={{
              gridTemplateColumns: `repeat(${filteredDays.length}, minmax(0, 1fr))`,
            }}
          >
            {/* Grid Line Guides */}
            <div className="absolute inset-x-2 top-20 border-b border-dashed border-slate-200 dark:border-slate-800 pointer-events-none" />
            <div className="absolute inset-x-2 top-1/2 border-b border-dashed border-slate-200 dark:border-slate-800 pointer-events-none" />

            {filteredDays.map((day, idx) => {
              let displayVal = day.totalSeconds;
              if (categoryFilter === 'concept') displayVal = day.conceptSeconds;
              if (categoryFilter === 'problem') displayVal = day.problemSeconds;
              if (categoryFilter === 'exercise') displayVal = day.exerciseSeconds;

              const heightPct =
                metrics.maxSec > 0
                  ? Math.max(Math.round((displayVal / metrics.maxSec) * 100), displayVal > 0 ? 6 : 2)
                  : 2;

              const conceptPct = displayVal > 0 && categoryFilter === 'all' ? (day.conceptSeconds / displayVal) * 100 : 0;
              const problemPct = displayVal > 0 && categoryFilter === 'all' ? (day.problemSeconds / displayVal) * 100 : 0;
              const exercisePct = displayVal > 0 && categoryFilter === 'all' ? (day.exerciseSeconds / displayVal) * 100 : 0;

              const isHovered = activeTooltipIdx === idx;

              // Smart horizontal positioning to avoid getting cut off on edges
              const tooltipAlignClass =
                idx >= filteredDays.length - 3
                  ? 'right-0 translate-x-0'
                  : idx <= 2
                  ? 'left-0 translate-x-0'
                  : 'left-1/2 -translate-x-1/2';

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center h-full justify-end relative group cursor-pointer"
                  onMouseEnter={() => setActiveTooltipIdx(idx)}
                  onMouseLeave={() => setActiveTooltipIdx(null)}
                  onClick={() => setActiveTooltipIdx(isHovered ? null : idx)}
                >
                  {/* Interactive Floating Tooltip - Positioned safely at top-2 inside chart bounds */}
                  {isHovered && (
                    <div
                      className={`absolute top-2 z-40 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded-2xl p-3 shadow-2xl border border-slate-700 whitespace-nowrap min-w-[170px] pointer-events-none ${tooltipAlignClass}`}
                    >
                      <p className="font-bold text-indigo-300 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between gap-2">
                        <span>{day.dayLabel}</span>
                        {day.totalSeconds > 0 && (
                          <span className="text-[10px] text-emerald-400 font-mono">Active</span>
                        )}
                      </p>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between gap-4 text-emerald-400">
                          <span>Concepts:</span>
                          <span>{formatSeconds(day.conceptSeconds)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-indigo-400">
                          <span>Problems:</span>
                          <span>{formatSeconds(day.problemSeconds)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-amber-400">
                          <span>Exercises:</span>
                          <span>{formatSeconds(day.exerciseSeconds)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-white font-bold border-t border-slate-800 pt-1 mt-1">
                          <span>Total:</span>
                          <span>{formatSeconds(day.totalSeconds)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bar Column */}
                  <div
                    className={`w-full max-w-[32px] rounded-xl overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:scale-105 ${
                      displayVal === 0
                        ? 'bg-slate-200/60 dark:bg-slate-800/40 h-1.5'
                        : isHovered
                        ? 'ring-2 ring-indigo-500 shadow-lg'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  >
                    {categoryFilter === 'all' ? (
                      <>
                        <div style={{ height: `${conceptPct}%` }} className="bg-emerald-500 w-full" />
                        <div style={{ height: `${problemPct}%` }} className="bg-indigo-600 w-full" />
                        <div style={{ height: `${exercisePct}%` }} className="bg-amber-500 w-full" />
                      </>
                    ) : categoryFilter === 'concept' ? (
                      <div className="bg-emerald-500 w-full h-full" />
                    ) : categoryFilter === 'problem' ? (
                      <div className="bg-indigo-600 w-full h-full" />
                    ) : (
                      <div className="bg-amber-500 w-full h-full" />
                    )}
                  </div>

                  {/* Day Label */}
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mt-2 truncate max-w-[40px]">
                    {day.shortLabel.split(' ')[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend & Categories */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-emerald-500" />
            <span className="font-bold">Concepts: {formatSeconds(metrics.conceptSec)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-indigo-600" />
            <span className="font-bold">Problem Reps: {formatSeconds(metrics.problemSec)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-amber-500" />
            <span className="font-bold">Exercises: {formatSeconds(metrics.exerciseSec)}</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 italic">
          💡 Click or hover any bar to inspect daily time distribution
        </div>
      </div>
    </div>
  );
};
