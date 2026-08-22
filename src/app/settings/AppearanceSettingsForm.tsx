'use client';

import React from 'react';
import { useTheme, Theme } from '@/components/ThemeProvider';
import { Sun, Moon, Laptop, Check, Sparkles, Eye, Palette } from 'lucide-react';
import { useToast } from '@/components/Toast';

export const AppearanceSettingsForm: React.FC = () => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    const label = newTheme === 'light' ? 'Light Mode' : newTheme === 'dark' ? 'Dark Mode' : 'System Default';
    toast('Theme Updated', `Switched theme to ${label}.`, 'info');
  };

  const themeOptions: Array<{
    id: Theme;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'light',
      title: 'Light Theme',
      description: 'Clean high-contrast daytime interface with crisp surfaces and vibrant indigo accents.',
      icon: <Sun className="w-5 h-5 text-amber-500" />,
    },
    {
      id: 'dark',
      title: 'Dark Theme',
      description: 'Deep obsidian and slate palette engineered for low eye fatigue during extended study sessions.',
      icon: <Moon className="w-5 h-5 text-indigo-400" />,
      badge: 'Recommended for Night Reps',
    },
    {
      id: 'system',
      title: 'System Synchronized',
      description: 'Automatically switches between light and dark mode according to your OS device preference.',
      icon: <Laptop className="w-5 h-5 text-sky-400" />,
      badge: `Currently: ${resolvedTheme === 'dark' ? 'Dark' : 'Light'}`,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Overview Banner Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 flex-shrink-0">
            <Palette className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Theme &amp; Visual Appearance
              </h3>
              <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Live Preview
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize how Sibar displays across your dashboard, study workspaces, and analytics.
            </p>
          </div>
        </div>

        {/* Quick Instant Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-semibold shadow-sm hover:shadow flex items-center gap-2 transition-all self-stretch sm:self-auto justify-center"
        >
          {resolvedTheme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Switch to Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span>Switch to Dark</span>
            </>
          )}
        </button>
      </div>

      {/* Theme Options Cards */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Select Preferred Color Scheme
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your selection is saved automatically and applies instantly across all tabs and study workspaces.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {themeOptions.map((opt) => {
            const isSelected = theme === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => handleThemeChange(opt.id)}
                className={`cursor-pointer rounded-3xl p-5 sm:p-6 border transition-all flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 shadow-xl shadow-indigo-600/10 ring-2 ring-indigo-500/20'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900 shadow-sm'
                }`}
              >
                {/* Visual UI Miniature Mockup */}
                <div className="mb-4">
                  {opt.id === 'light' && (
                    <div className="w-full h-28 rounded-2xl bg-slate-100 border border-slate-200 p-2.5 flex flex-col justify-between shadow-inner overflow-hidden">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                        <div className="w-12 h-2.5 bg-indigo-600 rounded-full"></div>
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                          <div className="w-3 h-3 rounded-full bg-indigo-200"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 py-1">
                        <div className="h-9 bg-white rounded-lg border border-slate-200 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-300 rounded"></div>
                          <div className="w-4 h-1 bg-indigo-400 rounded"></div>
                        </div>
                        <div className="h-9 bg-white rounded-lg border border-slate-200 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-300 rounded"></div>
                          <div className="w-4 h-1 bg-emerald-400 rounded"></div>
                        </div>
                        <div className="h-9 bg-white rounded-lg border border-slate-200 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-300 rounded"></div>
                          <div className="w-4 h-1 bg-amber-400 rounded"></div>
                        </div>
                      </div>
                      <div className="h-3 bg-white rounded-md border border-slate-200 flex items-center px-1.5">
                        <div className="w-14 h-1 bg-slate-400 rounded-full"></div>
                      </div>
                    </div>
                  )}

                  {opt.id === 'dark' && (
                    <div className="w-full h-28 rounded-2xl bg-slate-950 border border-slate-800 p-2.5 flex flex-col justify-between shadow-inner overflow-hidden">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <div className="w-12 h-2.5 bg-indigo-500 rounded-full"></div>
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                          <div className="w-3 h-3 rounded-full bg-indigo-900"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 py-1">
                        <div className="h-9 bg-slate-900 rounded-lg border border-slate-800 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-700 rounded"></div>
                          <div className="w-4 h-1 bg-indigo-400 rounded"></div>
                        </div>
                        <div className="h-9 bg-slate-900 rounded-lg border border-slate-800 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-700 rounded"></div>
                          <div className="w-4 h-1 bg-emerald-400 rounded"></div>
                        </div>
                        <div className="h-9 bg-slate-900 rounded-lg border border-slate-800 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-700 rounded"></div>
                          <div className="w-4 h-1 bg-amber-400 rounded"></div>
                        </div>
                      </div>
                      <div className="h-3 bg-slate-900 rounded-md border border-slate-800 flex items-center px-1.5">
                        <div className="w-14 h-1 bg-slate-600 rounded-full"></div>
                      </div>
                    </div>
                  )}

                  {opt.id === 'system' && (
                    <div className="w-full h-28 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-950 border border-slate-300 dark:border-slate-800 p-2.5 flex flex-col justify-between shadow-inner overflow-hidden relative">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-300 dark:border-slate-800 relative z-10">
                        <div className="w-12 h-2.5 bg-indigo-500 rounded-full"></div>
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                          <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 py-1 relative z-10">
                        <div className="h-9 bg-white/90 rounded-lg border border-slate-200 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-400 rounded"></div>
                          <div className="w-4 h-1 bg-indigo-400 rounded"></div>
                        </div>
                        <div className="h-9 bg-slate-800/90 rounded-lg border border-slate-700 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-600 rounded"></div>
                          <div className="w-4 h-1 bg-emerald-400 rounded"></div>
                        </div>
                        <div className="h-9 bg-slate-900/90 rounded-lg border border-slate-800 p-1 space-y-1">
                          <div className="w-6 h-1.5 bg-slate-700 rounded"></div>
                          <div className="w-4 h-1 bg-amber-400 rounded"></div>
                        </div>
                      </div>
                      <div className="h-3 bg-slate-200/80 dark:bg-slate-900/80 rounded-md border border-slate-300 dark:border-slate-800 flex items-center px-1.5 relative z-10">
                        <div className="w-14 h-1 bg-indigo-500 rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Title & Radio Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                        {opt.icon}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {opt.title}
                      </h4>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {opt.description}
                  </p>

                  {opt.badge && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                        <span>{opt.badge}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Display Preferences & Features */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Display Architecture &amp; Telemetry Rendering</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">KaTeX &amp; LaTeX Equations</span>
            <p className="leading-relaxed">
              Mathematical derivations dynamically adapt font contrast and formula visibility in both dark and light modes.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">Mermaid &amp; Function Plots</span>
            <p className="leading-relaxed">
              Diagram flows and cartesian coordinate graphs adjust grid lines and curve colors automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
