'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles,
  Brain,
  Flame,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Eye,
  Award,
  Zap,
  Target,
  BookOpen,
  ChevronRight,
  Compass,
  Trash2,
} from 'lucide-react';
import { StudyIntelligenceData } from '@/lib/gemini';
import { Lottie } from 'lottie-react';
import rocketAnimation from '../../public/animations/rocket-fly.json';
import loveAnimation from '../../public/animations/love.json';

const STORAGE_CACHE_KEY = 'sibar_study_intelligence_cache';
const STORAGE_GEN_KEY = 'sibar_study_intelligence_generating';
const STORAGE_GEN_TIME_KEY = 'sibar_study_intelligence_gen_start';

// Global reference for background fetch to survive in-memory navigation within SPA
declare global {
  interface Window {
    __sibar_study_intelligence_promise?: Promise<any> | null;
  }
}

interface StudyIntelligenceCardProps {
  studentName?: string;
}

export const StudyIntelligenceCard: React.FC<StudyIntelligenceCardProps> = ({
  studentName = 'Scholar',
}) => {
  const [data, setData] = useState<StudyIntelligenceData | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showLoveOverlay, setShowLoveOverlay] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize from cache and check if a generation is currently active
  useEffect(() => {
    setIsMounted(true);
    try {
      // 1. Check local cache
      const cached = localStorage.getItem(STORAGE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed);
      }

      // 2. Check if background generation is in-flight
      const isGen = localStorage.getItem(STORAGE_GEN_KEY) === 'true';
      const genStartTime = parseInt(localStorage.getItem(STORAGE_GEN_TIME_KEY) || '0', 10);
      const isFresh = Date.now() - genStartTime < 120000; // within 2 minutes

      if (isGen && isFresh) {
        setIsGenerating(true);
        // Attach to existing promise or poll if window promise was lost across hard nav
        if (window.__sibar_study_intelligence_promise) {
          window.__sibar_study_intelligence_promise
            .then((result) => {
              if (result?.success && result?.intelligence) {
                handleGenerationComplete(result.intelligence);
              }
            })
            .catch((err) => {
              console.error('Background generation error:', err);
              setIsGenerating(false);
              localStorage.removeItem(STORAGE_GEN_KEY);
            });
        } else {
          // Trigger fetch to complete in background
          triggerBackgroundFetch();
        }
      } else if (isGen && !isFresh) {
        // Expired generating state
        localStorage.removeItem(STORAGE_GEN_KEY);
      }
    } catch (e) {
      console.error('Error initializing Study Intelligence state:', e);
    }
  }, []);

  const handleGenerationComplete = (intelligenceData: StudyIntelligenceData) => {
    try {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(intelligenceData));
      localStorage.removeItem(STORAGE_GEN_KEY);
      localStorage.removeItem(STORAGE_GEN_TIME_KEY);
    } catch (e) {}

    setIsGenerating(false);
    setShowLoveOverlay(true);

    // Play love animation overlay for 2.5s, then show the intelligence card
    setTimeout(() => {
      setData(intelligenceData);
      setShowLoveOverlay(false);
    }, 2400);
  };

  const triggerBackgroundFetch = () => {
    setIsGenerating(true);
    setErrorMsg(null);
    localStorage.setItem(STORAGE_GEN_KEY, 'true');
    localStorage.setItem(STORAGE_GEN_TIME_KEY, String(Date.now()));

    const fetchPromise = fetch('/api/ai/study-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.intelligence) {
          handleGenerationComplete(resData.intelligence);
          return resData;
        } else {
          throw new Error(resData.error || 'Failed to generate study intelligence.');
        }
      })
      .catch((err) => {
        console.error('Study intelligence generation failed:', err);
        setErrorMsg(err.message || 'Generation failed. Please try again.');
        setIsGenerating(false);
        localStorage.removeItem(STORAGE_GEN_KEY);
        localStorage.removeItem(STORAGE_GEN_TIME_KEY);
      })
      .finally(() => {
        if (typeof window !== 'undefined') {
          window.__sibar_study_intelligence_promise = null;
        }
      });

    if (typeof window !== 'undefined') {
      window.__sibar_study_intelligence_promise = fetchPromise;
    }
  };

  const handleAsk = () => {
    triggerBackgroundFetch();
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_CACHE_KEY);
      localStorage.removeItem(STORAGE_GEN_KEY);
      localStorage.removeItem(STORAGE_GEN_TIME_KEY);
    } catch (e) {}
    setData(null);
    setErrorMsg(null);
  };

  if (!isMounted) {
    return (
      <div className="h-44 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-indigo-500/20 animate-pulse" />
    );
  }

  // ─── 1. Generating State (Rocket Lottie Animation) ───────────────────────────
  if (isGenerating) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/90 via-slate-900/90 to-purple-950/90 backdrop-blur-2xl border border-indigo-500/30 shadow-2xl p-8 sm:p-10 text-center text-white">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto py-2">
          {/* Lottie Rocket Loading Animation */}
          <div className="w-48 h-36 max-w-full flex items-center justify-center pointer-events-none">
            <Lottie
              src={rocketAnimation}
              loop={true}
              autoplay={true}
              className="w-full h-full object-contain scale-110"
            />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Study Telemetry</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Synthesizing Study Intelligence...
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
              Gemini AI is processing your active streaks, clean solve repetitions, syllabus progress, and content volume in the background.
            </p>
          </div>

          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden max-w-xs mt-2">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-pulse w-3/4 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // ─── 2. Love Celebration Overlay State ──────────────────────────────────────
  if (showLoveOverlay) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 backdrop-blur-2xl border border-pink-500/40 shadow-2xl p-8 text-center text-white flex flex-col items-center justify-center min-h-[220px]">
        <div className="w-44 h-44 flex items-center justify-center pointer-events-none">
          <Lottie
            src={loveAnimation}
            loop={false}
            autoplay={true}
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-sm font-bold text-pink-300 tracking-wide animate-pulse -mt-4">
          Study Intelligence Ready!
        </p>
      </div>
    );
  }

  // ─── 3. Idle / Preview Prompt State (No cached data yet) ────────────────────
  if (!data) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-purple-950/80 backdrop-blur-xl border border-indigo-500/30 dark:border-indigo-500/20 shadow-xl p-6 sm:p-8 text-white group hover:border-indigo-400/50 transition-all">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>Study Intelligence</span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                AI Coach
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Personalized AI Study Telemetry &amp; Coaching
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Sibar continuously analyzes your daily streak progression, mastered subchapters, problem rep volume, and content creations to deliver actionable cognitive insights.
            </p>

            {errorMsg && (
              <p className="text-xs text-rose-400 font-semibold bg-rose-950/50 border border-rose-800/80 rounded-xl p-2.5">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex-shrink-0 flex items-center gap-3">
            <button
              onClick={handleAsk}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-bold shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask Study Intelligence</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── 4. Render Generated Study Intelligence Report ──────────────────────────
  const generatedFriendlyTime = new Date(data.generatedAt * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/90 via-slate-900/90 to-purple-950/90 backdrop-blur-xl border border-indigo-500/30 shadow-xl p-6 sm:p-8 text-white space-y-6">
      <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header & Controls */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black border border-indigo-500/30 flex-shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Study Intelligence
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Live Insights
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cached &bull; Generated {generatedFriendlyTime}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Momentum Score Gauge */}
          <div className="flex items-center gap-2 bg-indigo-900/40 px-3.5 py-1.5 rounded-2xl border border-indigo-500/30">
            <Zap className="w-4 h-4 text-amber-400" />
            <div className="text-xs">
              <span className="font-extrabold text-white">{data.momentumScore}</span>
              <span className="text-slate-400 font-mono text-[10px]">/100 Momentum</span>
            </div>
          </div>

          <button
            onClick={handleAsk}
            title="Regenerate intelligence with latest telemetry"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
            <span>Ask Again</span>
          </button>

          <button
            onClick={handleClear}
            title="Clear generated intelligence report"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-xs font-semibold border border-rose-500/30 transition-all active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Main Headline */}
      <div className="relative z-10 space-y-1">
        <h4 className="text-lg sm:text-xl font-extrabold text-indigo-100 tracking-tight leading-snug">
          &ldquo;{data.headline}&rdquo;
        </h4>
      </div>

      {/* 2-Column Intelligence Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Streak Progression & Workload Breakdown */}
        <div className="space-y-4">
          
          {/* Streak Progression Section */}
          <div className="bg-slate-900/70 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <Flame className="w-4 h-4" />
              <span>{data.streakInsight.title}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {data.streakInsight.description}
            </p>
            <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
              {data.streakInsight.cadenceAssessment}
            </p>
          </div>

          {/* Workload Analysis */}
          <div className="bg-slate-900/70 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <TrendingUp className="w-4 h-4" />
              <span>Workload &amp; Content Contribution</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {data.workloadAnalysis.summary}
            </p>
            
            <div className="space-y-1.5 pt-1">
              {data.workloadAnalysis.keyHighlights.map((hl, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>

            {data.workloadAnalysis.contentContributionNote && (
              <p className="text-[11px] text-purple-300/90 font-medium pt-1">
                {data.workloadAnalysis.contentContributionNote}
              </p>
            )}
          </div>

        </div>

        {/* Right Column: Actionable Recommendations & Coach Closing Mantra */}
        <div className="space-y-4 flex flex-col justify-between">
          
          {/* Recommendations */}
          <div className="bg-slate-900/70 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Target className="w-4 h-4" />
              <span>Targeted Next Reps &amp; Recommendations</span>
            </div>
            <div className="space-y-2">
              {data.actionableRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-2 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-slate-200"
                >
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coach Closing Mantra Box */}
          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-purple-300">
                Coach&apos;s Mental Model
              </p>
              <p className="text-xs font-bold text-white tracking-wide">
                &ldquo;{data.coachClosingMantra}&rdquo;
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
