import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SettingsWorkspace } from './SettingsWorkspace';
import Link from 'next/link';
import { ArrowLeft, UserCog } from 'lucide-react';

export const revalidate = 0;

export default async function DedicatedSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <Navbar username={user.username} fullName={user.fullName} />

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Page Top Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <span>/</span>
              <span className="text-indigo-600 font-semibold">Settings</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <UserCog className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>User Profile &amp; Settings</span>
            </h1>
          </div>
        </div>

        {/* Settings Sidebar + Workspace */}
        <SettingsWorkspace user={user} />

      </div>
      <Footer />
    </div>
  );
}
