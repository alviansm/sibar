'use client';

import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, UserCog, KeyRound, ChevronRight, Quote, HardDrive, Activity } from 'lucide-react';
import { ProfileSettingsForm } from './ProfileSettingsForm';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { QuoteSettingsForm } from './QuoteSettingsForm';
import { GoogleDriveSettings } from './GoogleDriveSettings';
import { TelemetrySettingsView } from './TelemetrySettingsView';
import { useSearchParams } from 'next/navigation';
import { TelemetryOverviewData } from '@/lib/telemetry';

interface SettingsWorkspaceProps {
  user: {
    id: string;
    username: string;
    fullName?: string | null;
    quoteRefreshInterval?: string | null;
    quoteCategory?: string | null;
    createdAt?: number;
  };
  googleAccounts?: any[];
  initialOverview?: TelemetryOverviewData | null;
  initialTab?: 'profile' | 'quotes' | 'security' | 'telemetry';
}

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({
  user,
  googleAccounts = [],
  initialOverview = null,
  initialTab = 'profile',
}) => {
  const searchParams = useSearchParams();
  const tabFromQuery = searchParams.get('tab') as 'profile' | 'quotes' | 'security' | 'telemetry' | null;

  const [activeTab, setActiveTab] = useState<'profile' | 'quotes' | 'security' | 'telemetry'>(
    tabFromQuery || initialTab || 'profile'
  );

  useEffect(() => {
    if (tabFromQuery && ['profile', 'quotes', 'security', 'telemetry'].includes(tabFromQuery)) {
      setActiveTab(tabFromQuery);
    }
  }, [tabFromQuery]);

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
      
      {/* Left Settings Sidebar / Mobile Horizontal Tabs Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-m3-1 flex-shrink-0">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2 hidden md:block">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Settings Navigation</span>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account &amp; Preference</h2>
        </div>

        <nav className="flex md:flex-col gap-1.5 md:gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 md:flex-initial flex items-center justify-between px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/40 md:bg-transparent'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <UserCog className="w-4 h-4 flex-shrink-0" />
              <span>Profile Settings</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 opacity-60 hidden md:block ${activeTab === 'profile' ? 'text-white' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex-1 md:flex-initial flex items-center justify-between px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'telemetry'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/40 md:bg-transparent'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Activity className="w-4 h-4 flex-shrink-0" />
              <span>Activity &amp; Telemetry</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 opacity-60 hidden md:block ${activeTab === 'telemetry' ? 'text-white' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex-1 md:flex-initial flex items-center justify-between px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'quotes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/40 md:bg-transparent'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <Quote className="w-4 h-4 flex-shrink-0" />
              <span>Motivational Quote</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 opacity-60 hidden md:block ${activeTab === 'quotes' ? 'text-white' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 md:flex-initial flex items-center justify-between px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-slate-50 dark:bg-slate-800/40 md:bg-transparent'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <KeyRound className="w-4 h-4 flex-shrink-0" />
              <span>Security &amp; Password</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 opacity-60 hidden md:block ${activeTab === 'security' ? 'text-white' : ''}`} />
          </button>
        </nav>
      </aside>

      {/* Main Right Content Section */}
      <main className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 md:p-8 shadow-m3-1 space-y-6 min-w-0">
        
        {/* Section Header */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {activeTab === 'profile' && (
              <>
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Profile Settings</span>
              </>
            )}
            {activeTab === 'telemetry' && (
              <>
                <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Activity &amp; Telemetry Insights</span>
              </>
            )}
            {activeTab === 'quotes' && (
              <>
                <Quote className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Motivational Quote Settings</span>
              </>
            )}
            {activeTab === 'security' && (
              <>
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Security &amp; Password</span>
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === 'profile' && 'Manage your public persona, display name, cognitive telemetry preferences, and Google Drive storage.'}
            {activeTab === 'telemetry' && 'Audit trail and frequency analysis of your study activities, concept completions, and reps.'}
            {activeTab === 'quotes' && 'Configure API Ninjas quotes, refresh interval (hourly/daily/always), and 50 local quotes fallback.'}
            {activeTab === 'security' && 'Update your login password and protect your cognitive training archive.'}
          </p>
        </div>

        {/* Tab Content Form */}
        {activeTab === 'profile' && <ProfileSettingsForm user={user} googleAccounts={googleAccounts} />}
        {activeTab === 'telemetry' && <TelemetrySettingsView initialOverview={initialOverview} />}
        {activeTab === 'quotes' && <QuoteSettingsForm user={user} />}
        {activeTab === 'security' && <SecuritySettingsForm />}

      </main>

    </div>
  );
};


