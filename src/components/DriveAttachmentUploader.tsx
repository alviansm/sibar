'use client';

import React, { useState, useEffect } from 'react';
import { HardDrive, UploadCloud, Loader2, Paperclip, AlertCircle, ChevronDown, Check } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { getGoogleAccountsAction } from '@/app/actions/drive';

export interface DriveAttachmentRecord {
  id: string;
  google_account_id?: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  drive_file_id: string;
  web_view_link: string;
  thumbnail_link?: string | null;
  entity_type: 'concept' | 'problem' | 'exercise_set' | 'attempt';
  entity_id: string;
  created_at: number;
}

interface DriveAttachmentUploaderProps {
  entityType: 'concept' | 'problem' | 'exercise_set' | 'attempt';
  entityId: string;
  projectSlug?: string;
  onUploadSuccess: (attachment: DriveAttachmentRecord) => void;
  className?: string;
  buttonLabel?: string;
  accept?: string;
}

export const DriveAttachmentUploader: React.FC<DriveAttachmentUploaderProps> = ({
  entityType,
  entityId,
  projectSlug,
  onUploadSuccess,
  className = '',
  buttonLabel = 'Attach to Google Drive',
  accept = 'image/*,application/pdf,.doc,.docx,.txt',
}) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getGoogleAccountsAction().then((res) => {
      if (!mounted) return;
      if (res.accounts && res.accounts.length > 0) {
        setAccounts(res.accounts);
        const def = res.accounts.find((a) => a.is_default) || res.accounts[0];
        setSelectedAccountId(def.id);
      }
      setIsLoadingAccounts(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!selectedAccountId) {
      toast('No Account Selected', 'Please connect a Google Drive account first.', 'warning');
      return;
    }

    const file = files[0];
    // Limit to 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast('File Too Large', 'Maximum attachment size is 50MB.', 'error');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('googleAccountId', selectedAccountId);
    fd.append('entityType', entityType);
    fd.append('entityId', entityId);
    if (projectSlug) {
      fd.append('projectSlug', projectSlug);
    }

    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      toast('Uploaded to Drive', `${file.name} saved to your Google Drive!`, 'success');
      onUploadSuccess(data.attachment);
    } catch (err: any) {
      toast('Upload Error', err.message || 'Failed to upload attachment.', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  if (isLoadingAccounts) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Checking Google Drive...</span>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-700/80 cursor-not-allowed opacity-75 select-none"
          title="Google Drive not connected. Connect your Google account in Profile Settings to attach files."
        >
          <Paperclip className="w-3.5 h-3.5 opacity-50" />
          <span>Attach (Drive Not Connected)</span>
        </button>
      </div>
    );
  }

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Account Switcher (if multiple accounts connected) */}
      {accounts.length > 1 && (
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          disabled={isUploading}
          className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.email} {acc.is_default ? '★' : ''}
            </option>
          ))}
        </select>
      )}

      {/* Upload Button */}
      <label
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
          isUploading
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-sm'
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Uploading to Drive...</span>
          </>
        ) : (
          <>
            <Paperclip className="w-3.5 h-3.5" />
            <span>{buttonLabel}</span>
          </>
        )}
        <input
          type="file"
          accept={accept}
          disabled={isUploading}
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
};
