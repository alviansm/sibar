'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, Check } from 'lucide-react';
import { DEFAULT_WORKSPACE_THUMBNAIL } from '@/lib/constants';

interface WorkspaceImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

const isPlaceholderUrl = (url?: string | null) => {
  if (!url) return true;
  const trimmed = url.trim();
  return (
    trimmed === '' ||
    trimmed === DEFAULT_WORKSPACE_THUMBNAIL ||
    trimmed === '/images/public-examination-preparation-concept.jpg' ||
    trimmed === '/public-examination-preparation-concept.jpg'
  );
};

export const WorkspaceImageUploader: React.FC<WorkspaceImageUploaderProps> = ({
  value,
  onChange,
  label = 'Workspace Thumbnail Image',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displaySrc, setDisplaySrc] = useState<string>(
    isPlaceholderUrl(value) ? DEFAULT_WORKSPACE_THUMBNAIL : (value || DEFAULT_WORKSPACE_THUMBNAIL)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCustom = !isPlaceholderUrl(value);

  useEffect(() => {
    if (isPlaceholderUrl(value)) {
      setDisplaySrc(DEFAULT_WORKSPACE_THUMBNAIL);
    } else if (value) {
      setDisplaySrc(value);
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate maximum file size < 1MB (1,048,576 bytes)
    const MAX_SIZE_BYTES = 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Image too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 1 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate MIME type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPG, WEBP, SVG, GIF).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Failed to upload image.');
      }

      setDisplaySrc(data.url);
      onChange(data.url);
    } catch (err: any) {
      setError(err?.message || 'Error uploading image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResetToDefault = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDisplaySrc(DEFAULT_WORKSPACE_THUMBNAIL);
    onChange(null);
    setError(null);
  };

  const handleImageError = () => {
    setDisplaySrc(DEFAULT_WORKSPACE_THUMBNAIL);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        {label}
      </label>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
        {/* Thumbnail Preview Area */}
        <div className="relative w-full sm:w-40 h-24 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex-shrink-0 group">
          <img
            src={displaySrc}
            alt="Workspace thumbnail"
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
          {isCustom ? (
            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white shadow">
              Custom
            </span>
          ) : (
            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-200 shadow">
              Default Placeholder
            </span>
          )}
        </div>

        {/* Upload Action Controls */}
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml, image/gif"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isCustom ? 'Replace Custom Image' : 'Upload Custom Image'}</span>
                </>
              )}
            </button>

            {isCustom && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Reset to Default
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            JPG, PNG, WEBP, or SVG under <strong className="font-semibold text-slate-700 dark:text-slate-300">1 MB</strong>. Defaults to public exam concept placeholder.
          </p>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
