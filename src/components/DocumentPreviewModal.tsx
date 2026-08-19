'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, FileText, Loader2 } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  src: string;
  fileName?: string;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  src,
  fileName = 'Document Preview',
  onClose,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !src) return null;

  // Convert Google Drive view URL to embeddable preview URL
  const getEmbedUrl = (rawUrl: string): string => {
    if (rawUrl.includes('drive.google.com/file/d/')) {
      const match = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    } else if (rawUrl.includes('drive.google.com/open?id=')) {
      const match = rawUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    return rawUrl;
  };

  const embedUrl = getEmbedUrl(src);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0 border border-red-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {fileName.replace(/^[📄\s]+/, '')}
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">Interactive In-App Viewer</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors"
            >
              <span>Open in Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Iframe Embed */}
        <div className="relative flex-1 w-full h-full bg-slate-100 dark:bg-slate-950">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Loading document preview...</span>
            </div>
          )}
          <iframe
            src={embedUrl}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-0 rounded-b-3xl"
            allow="autoplay"
            title={fileName}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
