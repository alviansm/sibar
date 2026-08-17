'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Timer,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'timer';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (title: string, message?: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, message?: string, type: ToastType = 'info', duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, title, message, type, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[110] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-300 transition-all ${
              t.type === 'success'
                ? 'bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-500/10'
                : t.type === 'error'
                ? 'bg-slate-900/95 text-white border-rose-500/40 shadow-rose-500/10'
                : t.type === 'warning'
                ? 'bg-slate-900/95 text-white border-amber-500/40 shadow-amber-500/10'
                : t.type === 'timer'
                ? 'bg-slate-900/95 text-white border-sky-500/40 shadow-sky-500/10'
                : 'bg-slate-900/95 text-white border-indigo-500/40 shadow-indigo-500/10'
            }`}
          >
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {t.type === 'timer' && <Timer className="w-5 h-5 text-sky-400 animate-pulse" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-indigo-400" />}
            </div>

            {/* Content */}
            <div className="flex-1 pr-2">
              <h4 className="text-xs font-bold tracking-tight">{t.title}</h4>
              {t.message && (
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{t.message}</p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
