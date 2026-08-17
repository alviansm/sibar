'use client';

import React, { useState } from 'react';
import { User, ShieldCheck, UserCog, KeyRound, ChevronRight, Quote } from 'lucide-react';
import { ProfileSettingsForm } from './ProfileSettingsForm';
import { SecuritySettingsForm } from './SecuritySettingsForm';
import { QuoteSettingsForm } from './QuoteSettingsForm';

interface SettingsWorkspaceProps {
  user: {
    id: string;
    username: string;
    fullName?: string | null;
    quoteRefreshInterval?: string | null;
    quoteCategory?: string | null;
    createdAt?: number;
  };
}

export const SettingsWorkspace: React.FC<SettingsWorkspaceProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'quotes'>('profile');

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      
      {/* Left Settings Sidebar Navigation Navbar */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-m3-1 flex-shrink-0">
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Settings Navigation</span>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Account &amp; Preference</h2>
        </div>

        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UserCog className="w-4 h-4" />
              <span>Profile Settings</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'profile' ? 'text-white' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'quotes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Quote className="w-4 h-4" />
              <span>Motivational Quote</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'quotes' ? 'text-white' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4" />
              <span>Security &amp; Password</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${activeTab === 'security' ? 'text-white' : ''}`} />
          </button>
        </nav>
      </aside>

      {/* Main Right Content Section */}
      <main className="flex-1 w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 space-y-6">
        
        {/* Section Header */}
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            {activeTab === 'profile' && (
              <>
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Profile Settings</span>
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
            {activeTab === 'profile' && 'Manage your public persona, display name, and cognitive telemetry preferences.'}
            {activeTab === 'quotes' && 'Configure API Ninjas quotes, refresh interval (hourly/daily/always), and 50 local quotes fallback.'}
            {activeTab === 'security' && 'Update your login password and protect your cognitive training archive.'}
          </p>
        </div>

        {/* Tab Content Form */}
        {activeTab === 'profile' && <ProfileSettingsForm user={user} />}
        {activeTab === 'quotes' && <QuoteSettingsForm user={user} />}
        {activeTab === 'security' && <SecuritySettingsForm />}

      </main>

    </div>
  );
};

