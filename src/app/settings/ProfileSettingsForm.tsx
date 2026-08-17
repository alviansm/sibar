'use client';

import React, { useState, useTransition } from 'react';
import { updateProfileNameAction } from '@/app/actions/user';
import { useToast } from '@/components/Toast';
import { User, Check, Loader2, Calendar, ShieldCheck, BadgeCheck } from 'lucide-react';

interface ProfileSettingsFormProps {
  user: {
    id: string;
    username: string;
    fullName?: string | null;
    createdAt?: number;
  };
}

export const ProfileSettingsForm: React.FC<ProfileSettingsFormProps> = ({ user }) => {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const getInitials = () => {
    if (fullName && fullName.trim().length > 0) {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (user.username && user.username.length > 0) {
      const parts = user.username.replace(/[-_]/g, ' ').trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'SB';
  };

  const initials = getInitials();
  const formattedDate = user.createdAt
    ? new Date(user.createdAt * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Member';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('fullName', fullName);

    startTransition(async () => {
      const result = await updateProfileNameAction(null, formData);
      if (result?.error) {
        toast('Update Failed', result.error, 'error');
      } else {
        toast('Profile Saved', result?.message || 'Your full name has been updated.', 'success');
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Profile Overview Card */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white text-2xl font-black tracking-wider flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-xl flex-shrink-0">
          {initials}
        </div>
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {fullName || user.username}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <BadgeCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>Cognitive Scholar</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            @{user.username}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Member since {formattedDate}</span>
          </p>
        </div>
      </div>

      {/* Profile Details Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          {/* Full Name Input */}
          <div className="space-y-2 col-span-1 sm:col-span-2">
            <label htmlFor="fullName" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alvian Rahman"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This name will be displayed in your dashboard greeting header and user profile menu.
            </p>
          </div>

          {/* Username (Read Only) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-sm font-mono text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-400">Username is unique and cannot be changed.</p>
          </div>

          {/* Account Role Badge */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Account Role
            </label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-sm font-medium text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Primary Telemetry Administrator</span>
            </div>
          </div>

        </div>

        {/* Form Action Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
