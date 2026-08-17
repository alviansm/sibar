'use client';

import React, { useActionState } from 'react';
import { loginAction, getCaptchaAction } from '@/app/actions/auth';
import { BrainCircuit, KeyRound, User, Sparkles, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { CaptchaField, CaptchaData } from '@/components/CaptchaField';

interface LoginFormProps {
  initialCaptcha: CaptchaData;
}

export function LoginForm({ initialCaptcha }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo & Headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-slate-900 border border-indigo-500/30 text-white shadow-xl shadow-indigo-500/25 mb-4 p-2.5">
            <img src="/favicon.ico" alt="Sibar Icon" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Sibar <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">Sinau Bareng</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            AI-Assisted Self-Learning Archive & Telemetry System
          </p>
        </div>

        {/* Material 3 Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6 text-xs font-medium text-slate-400 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Single-user authenticated telemetry archive. Secured with IP Rate Limiting & Captcha.</span>
          </div>

          {state?.error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-medium flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>{state.error}</div>
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="Enter admin username"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
                />
              </div>
            </div>

            {/* Custom Interactive STEM Math Captcha */}
            <CaptchaField
              initialCaptcha={initialCaptcha}
              onRefreshCaptcha={getCaptchaAction}
            />

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group transition-all disabled:opacity-50"
            >
              <span>{isPending ? 'Authenticating...' : 'Access Telemetry Archive'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Powered by Google Gemini 2.5 & LaTeX Engine</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
