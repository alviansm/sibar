'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, AlertTriangle, RefreshCw, Loader2, Key, Clock } from 'lucide-react';

interface AiStatusData {
  status: 'success' | 'error' | 'untested';
  model?: string;
  latencyMs?: number;
  message?: string;
  details?: string;
  lastCheckedAt?: string;
}

const STORAGE_KEY = 'sibar_ai_api_check_cache';

export const AiApiChecker: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState<AiStatusData>({ status: 'untested' });

  const runCheck = async () => {
    setLoading(true);
    const nowISO = new Date().toISOString();
    try {
      const res = await fetch('/api/ai/check-status');
      const json = await res.json();
      const newStatus: AiStatusData = {
        ...json,
        lastCheckedAt: nowISO,
      };
      setStatusData(newStatus);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newStatus));
      }
    } catch (e: any) {
      const errorStatus: AiStatusData = {
        status: 'error',
        message: 'Network error checking Gemini AI status.',
        details: e.message || 'Could not reach server endpoint.',
        lastCheckedAt: nowISO,
      };
      setStatusData(errorStatus);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(errorStatus));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setStatusData(parsed);
          return;
        } catch {
          // ignore JSON parse error
        }
      }
    }
    // If no session cache exists, run test once for this session automatically
    runCheck();
  }, []);

  const formatLastChecked = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return null;
    }
  };

  const lastCheckedTimeStr = formatLastChecked(statusData.lastCheckedAt);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Gemini AI Engine Status</span>
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <span>Live API connectivity &amp; model telemetry</span>
              {lastCheckedTimeStr && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium border-l border-slate-200 dark:border-slate-700 pl-2">
                  <Clock className="w-3 h-3 text-indigo-500" />
                  <span>Last checked {lastCheckedTimeStr}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={runCheck}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Test Connection</span>
        </button>
      </div>

      {loading ? (
        <div className="py-3 flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Testing Gemini API connectivity...</span>
        </div>
      ) : statusData.status === 'success' ? (
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                Operational ({statusData.model || 'gemini-3.6-flash'})
              </span>
              <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                {statusData.message}
              </p>
            </div>
          </div>
          {typeof statusData.latencyMs === 'number' && (
            <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 self-start sm:self-center border border-emerald-200 dark:border-emerald-700">
              {statusData.latencyMs}ms Latency
            </span>
          )}
        </div>
      ) : statusData.status === 'untested' ? (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>Gemini AI API connection has not been tested in this session.</span>
          <button
            onClick={runCheck}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Run Test Now
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{statusData.message || 'Gemini API Error'}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-mono text-[10px] font-bold">
              ACTION REQUIRED
            </span>
          </div>

          <p className="text-rose-700 dark:text-rose-300 leading-relaxed font-medium">
            {statusData.details}
          </p>

          <div className="pt-1 flex items-center gap-2 text-rose-800 dark:text-rose-200 font-mono text-[11px]">
            <Key className="w-3.5 h-3.5" />
            <span>Set GEMINI_API_KEY in .env file (Get key at https://aistudio.google.com/)</span>
          </div>
        </div>
      )}
    </div>
  );
};

