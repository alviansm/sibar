'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FolderSync,
  Loader2,
} from 'lucide-react';
import {
  setDefaultGoogleAccountAction,
  disconnectGoogleAccountAction,
} from '@/app/actions/drive';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useSearchParams, useRouter } from 'next/navigation';

interface GoogleAccountItem {
  id: string;
  email: string;
  account_name?: string | null;
  avatar_url?: string | null;
  is_default: number;
  created_at: number;
}

interface GoogleDriveSettingsProps {
  initialAccounts: GoogleAccountItem[];
}

export const GoogleDriveSettings: React.FC<GoogleDriveSettingsProps> = ({
  initialAccounts,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<GoogleAccountItem[]>(initialAccounts);
  const [isPending, setIsPending] = useState(false);
  const [accountToDisconnect, setAccountToDisconnect] = useState<string | null>(null);

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      if (success === 'google_connected') {
        toast('Google Drive Connected', 'Your Google account has been connected successfully!', 'success');
      } else if (success === 'account_reconnected') {
        toast('Google Drive Reconnected', 'Your Google account session has been refreshed.', 'success');
      }
      router.replace('/settings');
    } else if (error) {
      let errorMsg = error;
      if (error === 'no_refresh_token_reauth_required') {
        errorMsg = 'Google did not return a refresh token. Please re-authorize the app.';
      } else if (error === 'missing_auth_code') {
        errorMsg = 'Authentication was cancelled or code was not provided.';
      }
      toast('Connection Failed', errorMsg, 'error');
      router.replace('/settings');
    }
  }, [searchParams, toast, router]);

  const handleSetDefault = async (accountId: string) => {
    setIsPending(true);
    const res = await setDefaultGoogleAccountAction(accountId);
    setIsPending(false);

    if (res.error) {
      toast('Error', res.error, 'error');
    } else {
      setAccounts((prev) =>
        prev.map((acc) => ({
          ...acc,
          is_default: acc.id === accountId ? 1 : 0,
        }))
      );
      toast('Default Updated', 'Active Google Drive account changed.', 'success');
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!accountToDisconnect) return;

    setIsPending(true);
    const res = await disconnectGoogleAccountAction(accountToDisconnect);
    setIsPending(false);

    if (res.error) {
      toast('Error', res.error, 'error');
    } else {
      setAccounts((prev) => prev.filter((acc) => acc.id !== accountToDisconnect));
      toast('Disconnected', 'Google account disconnected successfully.', 'info');
    }
    setAccountToDisconnect(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Connected Google Drive Accounts</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Connect your Google account to store attachments (diagrams, worked solutions, figures, and handwritten notes) directly in your Google Drive without taking server space.
        </p>
      </div>

      {/* Account List */}
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <FolderSync className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Google Drive Account Connected</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-0.5">
                Connect a Google account to enable uploading concept attachments, problem diagrams, and handwritten notes.
              </p>
            </div>
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                acc.is_default
                  ? 'border-indigo-500/40 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                {acc.avatar_url ? (
                  <img
                    src={acc.avatar_url}
                    alt={acc.account_name || acc.email}
                    className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                    {acc.email.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {acc.account_name || acc.email}
                    </span>
                    {acc.is_default ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Default
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {acc.email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {!acc.is_default && (
                  <button
                    onClick={() => handleSetDefault(acc.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => setAccountToDisconnect(acc.id)}
                  disabled={isPending}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                  title="Disconnect account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Connect Button */}
      <div className="pt-2">
        <a
          href="/api/auth/google/connect"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{accounts.length > 0 ? 'Connect Another Google Account' : 'Connect Google Drive'}</span>
        </a>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>How Sibar organizes your Drive files</span>
        </div>
        <p>
          Uploaded attachments will be saved to your Google Drive in a dedicated <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-mono">Sibar / [Project Name] / [Category]</code> folder hierarchy.
        </p>
      </div>

      <ConfirmModal
        isOpen={!!accountToDisconnect}
        title="Disconnect Google Account"
        message="Are you sure you want to disconnect this Google Drive account? Existing uploaded files will remain in your Google Drive."
        confirmText="Disconnect"
        danger={true}
        onConfirm={handleDisconnectConfirm}
        onClose={() => setAccountToDisconnect(null)}
      />
    </div>
  );
};
