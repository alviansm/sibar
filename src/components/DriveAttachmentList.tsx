'use client';

import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  FileCode,
  Paperclip,
  ExternalLink,
  Trash2,
  Download,
  Loader2,
} from 'lucide-react';
import { DriveAttachmentRecord } from './DriveAttachmentUploader';
import { deleteAttachmentAction } from '@/app/actions/drive';
import { useToast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';

interface DriveAttachmentListProps {
  attachments: DriveAttachmentRecord[];
  onAttachmentDeleted?: (attachmentId: string) => void;
  canDelete?: boolean;
}

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const DriveAttachmentList: React.FC<DriveAttachmentListProps> = ({
  attachments,
  onAttachmentDeleted,
  canDelete = true,
}) => {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedToDelete, setSelectedToDelete] = useState<DriveAttachmentRecord | null>(null);

  const handleDeleteConfirm = async () => {
    if (!selectedToDelete) return;
    const id = selectedToDelete.id;
    setDeletingId(id);

    const res = await deleteAttachmentAction(id);
    setDeletingId(null);
    setSelectedToDelete(null);

    if (res.error) {
      toast('Delete Failed', res.error, 'error');
    } else {
      toast('Attachment Removed', 'File unlinked from this item.', 'info');
      onAttachmentDeleted?.(id);
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
        <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
        <span>Drive Attachments ({attachments.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((item) => {
          const isImage = item.mime_type?.startsWith('image/');
          const isPdf = item.mime_type?.includes('pdf');

          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-indigo-500/30 transition-all text-xs group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  {isImage ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : isPdf ? (
                    <FileText className="w-4 h-4 text-rose-500" />
                  ) : (
                    <FileCode className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <a
                    href={item.web_view_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block transition-colors"
                    title={item.file_name}
                  >
                    {item.file_name}
                  </a>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatBytes(item.file_size)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={item.web_view_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  title="Open in Google Drive"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {canDelete && (
                  <button
                    onClick={() => setSelectedToDelete(item)}
                    disabled={deletingId === item.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all disabled:opacity-50"
                    title="Delete attachment"
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={!!selectedToDelete}
        title="Remove Attachment"
        message={`Are you sure you want to remove "${selectedToDelete?.file_name}" from this item?`}
        confirmText="Remove"
        danger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setSelectedToDelete(null)}
      />
    </div>
  );
};
