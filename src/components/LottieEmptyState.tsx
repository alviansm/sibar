'use client';

import React from 'react';
import { Lottie } from 'lottie-react';
import emptyAnimation from '../../public/animations/empty.json';
import Link from 'next/link';
import { Sparkles, Plus } from 'lucide-react';

interface LottieEmptyStateProps {
  title: string;
  message: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const LottieEmptyState: React.FC<LottieEmptyStateProps> = ({
  title,
  message,
  actionText,
  actionHref,
  onAction,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 my-6 shadow-m3-1 flex flex-col items-center justify-center">
      <div className="w-56 h-56 max-w-full flex items-center justify-center pointer-events-none">
        <Lottie
          src={emptyAnimation}
          loop={true}
          autoplay={true}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="space-y-1 max-w-md">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {message}
        </p>
      </div>

      {actionText && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all m3-ripple"
            >
              <Sparkles className="w-4 h-4" />
              <span>{actionText}</span>
            </Link>
          ) : onAction ? (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all m3-ripple"
            >
              <Plus className="w-4 h-4" />
              <span>{actionText}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
