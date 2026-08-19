'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, BookOpen, Target, Award, Minimize2, Maximize2 } from 'lucide-react';
import { logClientActivityAction } from '@/app/actions/telemetry';
import { ActivityCategory } from '@/lib/telemetry';

interface SubchapterStudyTimerProps {
  category: 'concept' | 'problem' | 'exercise';
  activityName: string;
  subchapterName?: string;
  projectName?: string;
  outlineId?: string;
  entityId?: string;
  position?: 'top' | 'floating';
}

export function SubchapterStudyTimer({
  category,
  activityName,
  subchapterName,
  projectName,
  outlineId,
  entityId,
  position = 'floating',
}: SubchapterStudyTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const accumulatedSecondsRef = useRef(0);
  const lastSyncSecondsRef = useRef(0);

  // Timer Tick
  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          accumulatedSecondsRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);
    } else if (!isActive && interval) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  // Periodic and Unmount sync to telemetry activity log
  const syncTimeToServer = (finalSync = false) => {
    const unsyncedSeconds = accumulatedSecondsRef.current - lastSyncSecondsRef.current;
    if (unsyncedSeconds >= 10 || (finalSync && unsyncedSeconds >= 5)) {
      lastSyncSecondsRef.current = accumulatedSecondsRef.current;

      const actType =
        category === 'concept'
          ? 'concept_study_time'
          : category === 'problem'
          ? 'problem_study_time'
          : 'exercise_study_time';

      const title = `Studied ${category === 'concept' ? 'Concept' : category === 'problem' ? 'Problem/Worked Example' : 'Exercise'}: ${activityName}`;

      logClientActivityAction({
        activityType: actType,
        category: category as ActivityCategory,
        title,
        description: `Deliberate practice time spent on ${subchapterName || 'subchapter'}${projectName ? ` in ${projectName}` : ''}.`,
        metadata: {
          timeSpentSeconds: unsyncedSeconds,
          totalSessionSeconds: accumulatedSecondsRef.current,
          outlineId,
          entityId,
          activityName,
          subchapterName,
          projectName,
        },
      }).catch(() => {});
    }
  };

  // Sync every 45 seconds while active
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isActive) {
        syncTimeToServer(false);
      }
    }, 45000);

    return () => {
      clearInterval(syncInterval);
      syncTimeToServer(true);
    };
  }, [isActive, category, activityName, subchapterName, projectName, outlineId, entityId]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getCategoryColor = () => {
    switch (category) {
      case 'concept':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300',
          dot: 'bg-emerald-400',
          icon: <BookOpen className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case 'problem':
        return {
          bg: 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300',
          dot: 'bg-indigo-400',
          icon: <Target className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case 'exercise':
        return {
          bg: 'bg-amber-950/80 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400',
          icon: <Award className="w-3.5 h-3.5 text-amber-400" />,
        };
    }
  };

  const style = getCategoryColor();

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl backdrop-blur-xl border shadow-xl transition-all hover:scale-105 active:scale-95 ${style.bg}`}
          title="Expand Study Stopwatch"
        >
          <Timer className="w-4 h-4 animate-pulse" />
          <span className="font-mono text-xs font-bold text-white">{formatTimer(seconds)}</span>
          <Maximize2 className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        position === 'floating'
          ? 'fixed bottom-4 right-4 z-40 max-w-xs transition-all'
          : 'inline-flex items-center'
      }
    >
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl backdrop-blur-xl border shadow-xl ${style.bg}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {isActive && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
              />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`} />
          </span>
          {style.icon}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-white">
          <span>{formatTimer(seconds)}</span>
        </div>

        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          <button
            onClick={() => setIsActive(!isActive)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title={isActive ? 'Pause Timer' : 'Resume Timer'}
          >
            {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {position === 'floating' && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Minimize"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
