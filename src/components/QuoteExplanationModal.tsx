'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Loader2,
  Brain,
  Target,
  Compass,
  Zap,
  RefreshCw,
  Quote as QuoteIcon,
  AlertCircle,
  CheckCircle2,
  History,
} from 'lucide-react';

import { MathRenderer } from '@/components/MathRenderer';

export interface QuoteExplanationData {
  historical_context?: string;
  stem_mindset: string;
  learning_strategy: string;
  philosophical_insight: string;
  key_takeaway: string;
}


interface QuoteExplanationModalProps {
  isOpen: boolean;
  quote: string;
  author: string;
  onClose: () => void;
}

export const QuoteExplanationModal: React.FC<QuoteExplanationModalProps> = ({
  isOpen,
  quote,
  author,
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<QuoteExplanationData | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchExplanation = async () => {
    if (!quote) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/quotes/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote, author }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch AI quote explanation.');
      }

      setData(json.explanation);
      setCached(Boolean(json.cached));
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to Gemini AI. Check your GEMINI_API_KEY.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && quote) {
      fetchExplanation();
    }
  }, [isOpen, quote, author]);

  // Handle Escape Key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-6 my-auto max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Gemini AI Context &amp; Mindset
                </h3>
                {cached && (
                  <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Cached
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cognitive telemetry breakdown &amp; STEM learning strategies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Quote Display Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white border border-indigo-500/30 space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold uppercase tracking-wider">
            <QuoteIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Target Quote</span>
          </div>
          <p className="text-sm sm:text-base italic font-serif leading-relaxed text-slate-100">
            &ldquo;{quote}&rdquo;
          </p>
          <p className="text-xs font-medium text-indigo-300 text-right">
            &mdash; {author || 'Unknown'}
          </p>
        </div>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400 py-3 font-semibold text-xs animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Gemini 3.6 Flash is analyzing quote context for study reps...</span>
            </div>

            <div className="space-y-3">
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse"></div>
              <div className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse"></div>
              <div className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>AI Explanation Unavailable</span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">{error}</p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={fetchExplanation}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Gemini Analysis</span>
              </button>
            </div>
          </div>
        )}

        {/* Result Breakdown Content */}
        {!loading && data && (
          <div className="space-y-4 animate-in fade-in duration-300">
            
            {/* Section 0: Historical Context & Origin Story */}
            {data.historical_context && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Historical Context &amp; Origin Story</span>
                </div>
                <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  <MathRenderer content={data.historical_context} />
                </div>
              </div>
            )}

            {/* Section 1: STEM & Problem Solving Mindset */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>STEM &amp; Problem-Solving Mindset</span>
              </div>

              <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                <MathRenderer content={data.stem_mindset} />
              </div>
            </div>

            {/* Section 2: Actionable Learning Strategy */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Actionable Study Strategy</span>
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                <MathRenderer content={data.learning_strategy} />
              </div>
            </div>

            {/* Section 3: Philosophical Insight */}
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 space-y-2">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Compass className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Philosophical Insight</span>
              </div>
              <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                <MathRenderer content={data.philosophical_insight} />
              </div>
            </div>

            {/* Section 4: Key Takeaway Mantra */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900/10 dark:from-amber-500/20 dark:to-purple-900/20 border border-amber-300/50 dark:border-amber-700/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
                  Key Takeaway Mantra
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                  &ldquo;{data.key_takeaway}&rdquo;
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-400 font-mono text-[11px]">Powered by Google Gemini AI</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition-colors"
          >
            Close Breakdown
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
