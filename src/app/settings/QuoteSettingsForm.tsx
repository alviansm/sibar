'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { updateQuoteSettingsAction } from '@/app/actions/user';
import { useToast } from '@/components/Toast';
import {
  Quote,
  Clock,
  Sparkles,
  Check,
  Loader2,
  RefreshCw,
  Zap,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface QuoteSettingsFormProps {
  user: {
    id: string;
    quoteRefreshInterval?: string | null;
    quoteCategory?: string | null;
  };
}

export const QuoteSettingsForm: React.FC<QuoteSettingsFormProps> = ({ user }) => {
  const [interval, setInterval] = useState(user.quoteRefreshInterval || 'hourly');
  const [category, setCategory] = useState(user.quoteCategory || 'inspirational');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [previewQuote, setPreviewQuote] = useState<{
    quote: string;
    author: string;
    category?: string;
    source: 'api_ninjas' | 'local_fallback';
  } | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  const fetchPreview = async (refresh: boolean = false) => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch(`/api/quote?interval=${interval}&category=${category}&refresh=${refresh}`);
      const data = await res.json();
      if (data.success) {
        setPreviewQuote(data.quote);
        setHasApiKey(data.hasApiKey);
      }
    } catch (e) {
      console.error('Failed to fetch quote preview', e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview(false);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('quoteRefreshInterval', interval);
    formData.append('quoteCategory', category);

    startTransition(async () => {
      const result = await updateQuoteSettingsAction(null, formData);
      if (result?.error) {
        toast('Update Failed', result.error, 'error');
      } else {
        toast('Preferences Saved', result?.message || 'Quote settings updated successfully!', 'success');
        fetchPreview(true);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* API Ninjas Connectivity Banner */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            hasApiKey
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
          }`}>
            {hasApiKey ? <Zap className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                API Ninjas Connectivity
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                hasApiKey
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              }`}>
                {hasApiKey ? 'Live API Connected' : '50 Local Quotes Fallback Active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hasApiKey
                ? 'NINJAS_API_KEY is configured in .env. Live quotes will be fetched from API Ninjas.'
                : 'NINJAS_API_KEY is omitted in .env. The app seamlessly falls back to 50 local curated study quotes.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchPreview(true)}
          disabled={isLoadingPreview}
          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-1.5 flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPreview ? 'animate-spin' : ''}`} />
          <span>Test Fetch</span>
        </button>
      </div>

      {/* Quote Preview Card */}
      {previewQuote && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-purple-950 text-white border border-indigo-500/30 shadow-lg relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold border-b border-indigo-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-indigo-400" />
              <span>Live Quote Preview ({interval})</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-200">
              Source: {previewQuote.source === 'api_ninjas' ? 'API Ninjas' : 'Local Fallback (50 Quotes)'}
            </span>
          </div>
          <p className="text-base sm:text-lg italic font-serif leading-relaxed text-slate-100">
            &ldquo;{previewQuote.quote}&rdquo;
          </p>
          <div className="text-right text-xs font-semibold text-indigo-300">
            &mdash; {previewQuote.author}
          </div>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Refresh Frequency Select */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Refresh Frequency
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Clock className="w-4 h-4" />
              </div>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all appearance-none cursor-pointer"
              >
                <option value="hourly">Every Hour (Hourly)</option>
                <option value="daily">Every Day (Daily)</option>
                <option value="always">Every Page Load (Always)</option>
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controls how often the motivational quote changes on your dashboard hero banner.
            </p>
          </div>

          {/* Quote Topic / Category Select */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Quote Topic / Category
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all appearance-none cursor-pointer"
              >
                <option value="inspirational">Inspirational &amp; Grit</option>
                <option value="learning">Learning &amp; Study Reps</option>
                <option value="education">Education &amp; Mastery</option>
                <option value="knowledge">Knowledge &amp; Science</option>
                <option value="success">Success &amp; Discipline</option>
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select category parameter passed to API Ninjas or filter key.
            </p>
          </div>

        </div>

        {/* Submit Action Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Quote Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
