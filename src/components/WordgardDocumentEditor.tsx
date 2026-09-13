'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Wordgard, menuBar } from 'wordgard/editor';
import { fullSchema } from 'wordgard/schema';
import { history } from 'wordgard/history';
import { serialize, Leaf, Plot } from 'wordgard/doc';
import { insertText } from 'wordgard/command';
import { MathRenderer } from '@/components/MathRenderer';
import { DriveAttachmentUploader } from '@/components/DriveAttachmentUploader';
import {
  Sparkles,
  Eye,
  Edit3,
  Sigma,
  Pi,
  LineChart,
  GitGraph,
  Image as ImageIcon,
  Paperclip,
  Maximize2,
  Minimize2,
  HelpCircle,
} from 'lucide-react';

export interface WordgardDocumentEditorRef {
  getHtml: () => string;
  insertSnippet: (snippet: string) => void;
  focus: () => void;
}

interface WordgardDocumentEditorProps {
  initialContent: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  outlineId?: string;
  projectSlug?: string;
  entityType?: 'concept' | 'problem';
  entityId?: string;
}

function markdownOrTextToHtml(text: string): string {
  if (!text) return '<p></p>';
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  // Convert standard markdown paragraphs to HTML
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
      if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith('> ')) return `<blockquote>${trimmed.slice(2)}</blockquote>`;
      const withBr = trimmed.replace(/\n/g, '<br>');
      return `<p>${withBr}</p>`;
    })
    .join('');
}

export const WordgardDocumentEditor = forwardRef<WordgardDocumentEditorRef, WordgardDocumentEditorProps>(
  ({ initialContent, onChange, placeholder, outlineId, projectSlug, entityType = 'concept', entityId }, ref) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const wordgardInstanceRef = useRef<Wordgard | null>(null);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [currentHtml, setCurrentHtml] = useState<string>(initialContent || '');
    const [isFullWidth, setIsFullWidth] = useState<boolean>(false);

    // Initialize Wordgard instance
    useEffect(() => {
      if (!editorContainerRef.current) return;

      // Clean up previous editor if re-mounting
      editorContainerRef.current.innerHTML = '';

      const startingHtml = markdownOrTextToHtml(initialContent);

      try {
        const wg = Wordgard.create({
          parent: editorContainerRef.current,
          doc: startingHtml,
          config: [
            fullSchema(),
            history(),
            menuBar(),
            Wordgard.updateListener.of((update) => {
              if (update.docChanged) {
                try {
                  const html = serialize(update.state.doc).toHTML();
                  setCurrentHtml(html);
                  if (onChange) onChange(html);
                } catch (e) {
                  console.error('Error serializing Wordgard doc:', e);
                }
              }
            }),
          ],
        });

        wordgardInstanceRef.current = wg;
      } catch (err) {
        console.error('Failed to initialize Wordgard editor:', err);
      }

      return () => {
        if (wordgardInstanceRef.current) {
          wordgardInstanceRef.current = null;
        }
      };
    }, []);

    const handleInsertSnippet = (snippet: string) => {
      const wg = wordgardInstanceRef.current;
      if (!wg) {
        // Fallback if editor not mounted yet
        setCurrentHtml((prev) => prev + snippet);
        if (onChange) onChange(currentHtml + snippet);
        return;
      }

      try {
        const { state } = wg;
        const from = state.selection.from;
        const to = state.selection.to;
        const trSpec = insertText(wg, {
          from,
          to,
          insert: snippet,
          userEvent: 'input',
        });
        if (trSpec) {
          wg.dispatch(trSpec);
        }
      } catch (e) {
        console.warn('Wordgard insertText error, falling back:', e);
        // Fallback append
        setCurrentHtml((prev) => prev + snippet);
        if (onChange) onChange(currentHtml + snippet);
      }
    };

    useImperativeHandle(ref, () => ({
      getHtml: () => {
        if (wordgardInstanceRef.current) {
          try {
            return serialize(wordgardInstanceRef.current.state.doc).toHTML();
          } catch (e) {
            return currentHtml;
          }
        }
        return currentHtml;
      },
      insertSnippet: handleInsertSnippet,
      focus: () => {
        if (wordgardInstanceRef.current) {
          wordgardInstanceRef.current.contentDOM?.focus();
        }
      },
    }));

    return (
      <div className="w-full flex flex-col items-center space-y-4">
        {/* Editor Companion Toolbar (STEM Math, Diagrams, Drive, View Mode) */}
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-2.5 transition-all">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>STEM Tools</span>
            </span>

            {/* Math Formula Shortcuts */}
            <button
              type="button"
              onClick={() => handleInsertSnippet(' $f(x) = x^2$ ')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 font-mono font-semibold border border-slate-200/80 dark:border-slate-700 transition-colors flex items-center gap-1"
              title="Insert Inline LaTeX Formula ($...$)"
            >
              <Pi className="w-3.5 h-3.5 text-indigo-500" />
              <span>$Math$</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertSnippet('\n$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$\n')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 font-mono font-semibold border border-slate-200/80 dark:border-slate-700 transition-colors flex items-center gap-1"
              title="Insert Centered Block LaTeX Equation ($$...$$)"
            >
              <Sigma className="w-3.5 h-3.5 text-indigo-500" />
              <span>$$Block$$</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertSnippet('\n```plot\nfn: sin(x)\nrange: [-6.28, 6.28]\n```\n')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 transition-colors flex items-center gap-1"
              title="Insert Interactive 2D Function Plot"
            >
              <LineChart className="w-3.5 h-3.5 text-sky-500" />
              <span>Plot Graph</span>
            </button>

            <button
              type="button"
              onClick={() => handleInsertSnippet('\n```mermaid\ngraph LR\n  A[Theorem] --> B[Proof]\n  B --> C[Application]\n```\n')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 transition-colors flex items-center gap-1"
              title="Insert Mermaid Flowchart/Diagram"
            >
              <GitGraph className="w-3.5 h-3.5 text-purple-500" />
              <span>Diagram</span>
            </button>

            {outlineId && projectSlug && (
              <DriveAttachmentUploader
                entityType={entityType}
                entityId={entityId || outlineId}
                projectSlug={projectSlug}
                buttonLabel="Attach Drive File"
                onUploadSuccess={(att) => {
                  if (att.mime_type.startsWith('image/')) {
                    handleInsertSnippet(`\n<img src="${att.web_view_link}" alt="${att.file_name}" />\n`);
                  } else {
                    handleInsertSnippet(`\n<a href="${att.web_view_link}" target="_blank">📄 ${att.file_name}</a>\n`);
                  }
                }}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Width Toggle */}
            <button
              type="button"
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:block"
              title={isFullWidth ? 'Standard Google Docs Sheet Width' : 'Expand Width'}
            >
              {isFullWidth ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Document Editor</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (wordgardInstanceRef.current) {
                    try {
                      setCurrentHtml(serialize(wordgardInstanceRef.current.state.doc).toHTML());
                    } catch (e) {}
                  }
                  setViewMode('preview');
                }}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Math Preview</span>
              </button>
            </div>
          </div>
        </div>

        {/* The Google Docs / MS Word Paper Canvas */}
        <div
          className={`w-full transition-all duration-200 ${
            isFullWidth ? 'max-w-6xl' : 'max-w-4xl'
          } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl min-h-[780px] p-6 sm:p-12 relative flex flex-col`}
        >
          {viewMode === 'edit' ? (
            <div className="wordgard-workspace-wrapper flex-1">
              <div ref={editorContainerRef} className="wordgard-host-container" />
            </div>
          ) : (
            <div className="preview-document-wrapper flex-1 space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Rendered Document View (KaTeX &amp; Plots)</span>
                <span className="text-[11px] font-normal lowercase text-slate-400">
                  Click 'Document Editor' to resume editing
                </span>
              </div>
              <div className="py-2">
                {currentHtml.trim() ? (
                  <MathRenderer content={currentHtml} />
                ) : (
                  <p className="text-slate-400 italic text-sm py-12 text-center">
                    Document is currently empty.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scoped CSS styling for Wordgard components to match Google Docs / Word aesthetics & Dark mode */}
        <style jsx global>{`
          .wordgard-host-container {
            font-family: inherit;
            color: inherit;
          }

          wordgard-editor {
            display: flex;
            flex-direction: column;
            border-radius: 1rem;
            outline: none;
          }

          wg-panels {
            border-bottom: 1px solid rgba(148, 163, 184, 0.2);
            padding-bottom: 0.75rem;
            margin-bottom: 1.5rem;
          }

          wg-menubar {
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
            align-items: center;
          }

          wg-button, .wg-button {
            padding: 0.35rem 0.6rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            user-select: none;
            color: inherit;
          }

          wg-button:hover, .wg-button:hover {
            background-color: rgba(99, 102, 241, 0.1);
            color: #6366f1;
          }

          wg-button[aria-pressed="true"], .wg-button.wg-active {
            background-color: #6366f1;
            color: #ffffff;
          }

          wg-scroller {
            min-height: 550px;
            cursor: text;
          }

          wg-content {
            outline: none;
            font-size: 0.95rem;
            line-height: 1.75;
            color: inherit;
          }

          wg-content h1 {
            font-size: 1.85rem;
            font-weight: 800;
            letter-spacing: -0.025em;
            margin-top: 1.75rem;
            margin-bottom: 0.75rem;
          }

          wg-content h2 {
            font-size: 1.45rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-top: 1.5rem;
            margin-bottom: 0.6rem;
          }

          wg-content h3 {
            font-size: 1.2rem;
            font-weight: 600;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
          }

          wg-content p {
            margin-bottom: 1rem;
          }

          wg-content blockquote {
            border-left: 4px solid #6366f1;
            padding-left: 1rem;
            font-style: italic;
            margin: 1.25rem 0;
            opacity: 0.9;
          }

          wg-content ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin: 0.75rem 0;
          }

          wg-content ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin: 0.75rem 0;
          }

          wg-content li {
            margin-bottom: 0.35rem;
          }

          wg-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.25rem 0;
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 0.5rem;
            overflow: hidden;
          }

          wg-content th, wg-content td {
            border: 1px solid rgba(148, 163, 184, 0.25);
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
          }

          wg-content th {
            background-color: rgba(148, 163, 184, 0.1);
            font-weight: 600;
          }

          wg-content code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.85em;
            background-color: rgba(99, 102, 241, 0.1);
            color: #6366f1;
            padding: 0.15rem 0.35rem;
            border-radius: 0.35rem;
          }

          wg-content a {
            color: #6366f1;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          wg-content img {
            max-width: 100%;
            border-radius: 0.75rem;
            margin: 1rem 0;
          }
        `}</style>
      </div>
    );
  }
);

WordgardDocumentEditor.displayName = 'WordgardDocumentEditor';
