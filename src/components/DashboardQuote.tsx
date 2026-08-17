'use client';

import React, { useState, useEffect } from 'react';
import { Quote, RefreshCw, Sparkles, BookOpen } from 'lucide-react';
import { MotivationalQuote, QuoteInterval } from '@/lib/quotes';

interface DashboardQuoteProps {
  initialQuote?: MotivationalQuote | null;
  interval?: string | null;
  category?: string | null;
}

export const DashboardQuote: React.FC<DashboardQuoteProps> = ({
  initialQuote,
  interval = 'hourly',
  category = 'inspirational',
}) => {
  const [quote, setQuote] = useState<MotivationalQuote | null>(initialQuote || null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchQuote = async (forceRefresh: boolean = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `/api/quote?interval=${interval || 'hourly'}&category=${category || 'inspirational'}&refresh=${forceRefresh}`
      );
      const data = await res.json();
      if (data.success && data.quote) {
        setQuote(data.quote);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard quote', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialQuote) {
      fetchQuote(false);
    }
  }, [initialQuote, interval, category]);

  const displayInterval = (interval || 'hourly').toLowerCase();
  const intervalLabel =
    displayInterval === 'daily'
      ? 'Daily Quote'
      : displayInterval === 'always'
      ? 'Dynamic Quote'
      : 'Hourly Quote';

  return (
    <div className="space-y-2 max-w-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-[11px] font-semibold border border-indigo-500/30">
          <Quote className="w-3 h-3 text-indigo-300" />
          <span>{intervalLabel}</span>
        </span>

        {quote?.source && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              quote.source === 'api_ninjas'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-indigo-400/10 text-slate-300 border-slate-700'
            }`}
            title={
              quote.source === 'api_ninjas'
                ? 'Fetched from API Ninjas (https://api-ninjas.com/api/quotes)'
                : 'Loaded from local fallback dataset (50 study quotes)'
            }
          >
            {quote.source === 'api_ninjas' ? (
              <>
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                <span>API Ninjas</span>
              </>
            ) : (
              <>
                <BookOpen className="w-2.5 h-2.5 text-slate-300" />
                <span>50 Quotes Fallback</span>
              </>
            )}
          </span>
        )}

        <button
          type="button"
          onClick={() => fetchQuote(true)}
          disabled={isRefreshing}
          title="Refresh quote now"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {quote ? (
        <div className="space-y-1">
          <p className="text-slate-200 text-sm sm:text-base italic leading-relaxed font-serif">
            &ldquo;{quote.quote}&rdquo;
          </p>
          <p className="text-indigo-300 text-xs font-medium text-right sm:text-left">
            &mdash; {quote.author}
          </p>
        </div>
      ) : (
        <p className="text-slate-300 text-sm">
          Track your math derivation reps, study time, and problem friction like a high-performance athlete.
        </p>
      )}
    </div>
  );
};
