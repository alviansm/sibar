'use client';

import React, { useRef, useState } from 'react';
import {
  Sigma,
  Pi,
  LineChart,
  GitFork,
  Image as ImageIcon,
  Loader2,
  HelpCircle,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useToast } from './Toast';

interface RichContentToolbarProps {
  onInsert: (snippet: string) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Global helper to handle clipboard image pasting into any text field / textarea.
 */
export async function handleClipboardImagePaste(
  e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  onInsertText: (insertedMarkdown: string) => void,
  toast?: (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error') => void
): Promise<boolean> {
  const items = e.clipboardData?.items;
  if (!items) return false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;

      if (toast) toast('Uploading Image', 'Uploading image from clipboard...', 'info');

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.url) {
          onInsertText(`\n![Diagram](${data.url})\n`);
          if (toast) toast('Image Uploaded', 'Image pasted & inserted into markdown.', 'success');
          return true;
        } else {
          if (toast) toast('Upload Failed', data.error || 'Failed to upload pasted image', 'error');
        }
      } catch (err: any) {
        if (toast) toast('Upload Error', err?.message || 'Error uploading pasted image', 'error');
      }
    }
  }
  return false;
}

export const RichContentToolbar: React.FC<RichContentToolbarProps> = ({
  onInsert,
  className = '',
  compact = false,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        onInsert(`\n![${file.name.replace(/\.[^/.]+$/, '')}](${data.url})\n`);
        toast('Image Uploaded', 'Image markdown inserted successfully.', 'success');
      } else {
        toast('Upload Failed', data.error || 'Could not upload image.', 'error');
      }
    } catch (err: any) {
      toast('Upload Error', err?.message || 'Failed to upload file.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const insertInlineMath = () => onInsert('$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$');
  const insertBlockMath = () => onInsert('\n$$\n\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)\n$$\n');
  const insertPlot = () =>
    onInsert(
      '\n```plot\nfn: x^2 - 4\nrange: [-5, 5]\ngrid: true\ntitle: Parabola Example\n```\n'
    );
  const insertMermaid = () =>
    onInsert(
      '\n```mermaid\ngraph LR\n    A[Start] --> B{Condition}\n    B -->|Yes| C[Result A]\n    B -->|No| D[Result B]\n```\n'
    );

  return (
    <div
      className={`relative flex items-center flex-wrap gap-1 p-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl select-none ${className}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <button
        type="button"
        onClick={insertInlineMath}
        title="Inline Math ($...$)"
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all shadow-none hover:shadow-sm"
      >
        <Pi className="w-3.5 h-3.5 text-blue-500" />
        {!compact && <span>Math</span>}
      </button>

      <button
        type="button"
        onClick={insertBlockMath}
        title="Block Math ($$...$$)"
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all shadow-none hover:shadow-sm"
      >
        <Sigma className="w-3.5 h-3.5 text-indigo-500" />
        {!compact && <span>Block Math</span>}
      </button>

      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

      <button
        type="button"
        onClick={insertPlot}
        title="Function Plot (```plot...```)"
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all shadow-none hover:shadow-sm"
      >
        <LineChart className="w-3.5 h-3.5 text-emerald-500" />
        <span>Plot Graph</span>
      </button>

      <button
        type="button"
        onClick={insertMermaid}
        title="Diagram / Graph Theory (```mermaid...```)"
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all shadow-none hover:shadow-sm"
      >
        <GitFork className="w-3.5 h-3.5 text-purple-500" />
        <span>Diagram</span>
      </button>

      <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />

      <button
        type="button"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        title="Upload Image (or paste screenshot directly in text box)"
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all shadow-none hover:shadow-sm disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
        ) : (
          <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
        )}
        <span>{isUploading ? 'Uploading...' : 'Image'}</span>
      </button>

      <div className="ml-auto flex items-center">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          title="Rich Syntax Guide"
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Guide Popover */}
      {showHelp && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xl z-30 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-between font-semibold pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Syntax Quick Guide</span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3 mt-3">
            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">1. Math Expressions:</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Use <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">$...$</code> for inline or <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">$$...$$</code> for block equations.
              </p>
            </div>
            <div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">2. Function Plots:</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Use <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">```plot</code> block with <code className="font-mono">fn: sin(x)</code> and <code className="font-mono">range: [-5, 5]</code>.
              </p>
            </div>
            <div>
              <span className="font-semibold text-purple-600 dark:text-purple-400">3. Diagrams & Trees:</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Use <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">```mermaid</code> syntax for graph theory, trees, and state machines.
              </p>
            </div>
            <div>
              <span className="font-semibold text-amber-600 dark:text-amber-400">4. Images:</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Paste screenshots directly into the editor or use <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">![Alt](/url)</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
