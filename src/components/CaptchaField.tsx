'use client';

import React, { useState, useTransition } from 'react';
import { RefreshCw, Calculator, ShieldCheck } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export interface CaptchaData {
  question: string;
  token: string;
  timestamp: number;
  nonce: string;
}

interface CaptchaFieldProps {
  initialCaptcha: CaptchaData;
  onRefreshCaptcha: () => Promise<CaptchaData>;
}

export const CaptchaField: React.FC<CaptchaFieldProps> = ({
  initialCaptcha,
  onRefreshCaptcha,
}) => {
  const [captcha, setCaptcha] = useState<CaptchaData>(initialCaptcha);
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const nextCaptcha = await onRefreshCaptcha();
        setCaptcha(nextCaptcha);
      } catch (err) {
        console.error('Failed to refresh captcha:', err);
      }
    });
  };

  return (
    <div className="space-y-2 p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-2xl">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-indigo-400" />
          <span>Security Verification</span>
        </label>
        <span className="text-[10px] text-slate-400 font-mono">Anti-Crawler Protection</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Math Challenge Display */}
        <div className="flex-1 bg-slate-900/90 border border-indigo-500/30 rounded-xl py-2 px-3 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Solve:</span>
            <span className="font-mono text-base font-bold text-indigo-300">
              <InlineMath math={captcha.question} /> = ?
            </span>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            title="Get new captcha challenge"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Answer Input */}
        <div className="w-28">
          <input
            type="number"
            name="captcha_answer"
            required
            placeholder="Result"
            autoComplete="off"
            className="w-full text-center py-2 px-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
          />
        </div>
      </div>

      {/* Hidden Captcha Signature Verification Data */}
      <input type="hidden" name="captcha_token" value={captcha.token} />
      <input type="hidden" name="captcha_timestamp" value={captcha.timestamp} />
      <input type="hidden" name="captcha_nonce" value={captcha.nonce} />
    </div>
  );
};
