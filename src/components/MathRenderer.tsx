'use client';

import React, { useState } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { MermaidRenderer } from './MermaidRenderer';
import { FunctionPlotRenderer } from './FunctionPlotRenderer';
import { ImageLightboxModal } from './ImageLightboxModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { Maximize2, FileText, ExternalLink, Eye, Paperclip } from 'lucide-react';

interface MathRendererProps {
  content: string;
  className?: string;
}

interface BlockSegment {
  type: 'text' | 'math_block' | 'plot' | 'mermaid' | 'code';
  value: string;
  lang?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');
  const [docPreviewSrc, setDocPreviewSrc] = useState<string | null>(null);
  const [docPreviewName, setDocPreviewName] = useState<string>('');

  if (!content) return null;

  // 1. First pass: tokenize major fenced blocks (```lang ... ```) and math blocks ($$...$$)
  const segments: BlockSegment[] = [];
  
  // Combined regex for code fences and block math
  const mainBlockRegex = /(?:```([a-zA-Z0-9_-]*)\n([\s\S]*?)```)|(?:\$\$([\s\S]*?)\$\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mainBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: content.substring(lastIndex, match.index),
      });
    }

    if (match[1] !== undefined || match[2] !== undefined) {
      // Code block
      const lang = (match[1] || '').trim().toLowerCase();
      const code = match[2] || '';
      if (lang === 'plot' || lang === 'graph') {
        segments.push({ type: 'plot', value: code });
      } else if (lang === 'mermaid') {
        segments.push({ type: 'mermaid', value: code });
      } else {
        segments.push({ type: 'code', value: code, lang });
      }
    } else if (match[3] !== undefined) {
      // Block math $$...$$
      segments.push({ type: 'math_block', value: match[3] });
    }

    lastIndex = mainBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.substring(lastIndex) });
  }

  // Helper to check if a URL represents a document / PDF / Google Drive file
  const isDocumentOrDriveUrl = (url: string, label: string): boolean => {
    const lowerUrl = url.toLowerCase();
    const lowerLabel = label.toLowerCase();
    return (
      lowerUrl.includes('drive.google.com') ||
      lowerUrl.endsWith('.pdf') ||
      lowerUrl.endsWith('.doc') ||
      lowerUrl.endsWith('.docx') ||
      lowerUrl.endsWith('.txt') ||
      lowerLabel.endsWith('.pdf') ||
      lowerLabel.endsWith('.doc') ||
      lowerLabel.endsWith('.docx') ||
      lowerLabel.includes('📄')
    );
  };

  // 2. Helper to render text with Markdown images (![alt](url)), markdown links ([label](url)), and inline math
  const renderRichText = (text: string, keyPrefix: string) => {
    // Regex matching both images (![alt](url)) and links ([label](url))
    const mediaAndLinkRegex = /(!)?\[([^\]]*)\]\(([^)]+)\)/g;
    let currentIdx = 0;
    let tokenMatch: RegExpExecArray | null;
    const parts: React.ReactNode[] = [];

    while ((tokenMatch = mediaAndLinkRegex.exec(text)) !== null) {
      if (tokenMatch.index > currentIdx) {
        const precedingText = text.substring(currentIdx, tokenMatch.index);
        parts.push(...renderInlineMathAndFormatting(precedingText, `${keyPrefix}-txt-${currentIdx}`));
      }

      const isImage = tokenMatch[1] === '!';
      const label = tokenMatch[2] || '';
      const srcOrUrl = tokenMatch[3].trim();
      const cleanLabel = label.replace(/^[📄\s]+/, '').trim() || 'Document';

      if (isImage) {
        // Image item
        const alt = label || 'Diagram';
        parts.push(
          <span
            key={`${keyPrefix}-img-${tokenMatch.index}`}
            className="group relative my-3 inline-block max-w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 cursor-pointer"
            onClick={() => {
              setLightboxSrc(srcOrUrl);
              setLightboxAlt(alt);
            }}
          >
            <img
              src={srcOrUrl}
              alt={alt}
              loading="lazy"
              className="max-h-96 max-w-full object-contain rounded-2xl transition-transform duration-200 group-hover:scale-[1.01]"
            />
            <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-900/70 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3 h-3" />
              <span>Expand</span>
            </span>
            {alt && alt !== 'Diagram' && alt !== 'Pasted Image' && (
              <span className="block text-center text-xs text-slate-500 dark:text-slate-400 py-1.5 px-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800">
                {alt}
              </span>
            )}
          </span>
        );
      } else if (isDocumentOrDriveUrl(srcOrUrl, label)) {
        // Document / PDF / Google Drive Attachment Card
        parts.push(
          <span
            key={`${keyPrefix}-doc-${tokenMatch.index}`}
            className="my-3 flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-red-50/60 via-amber-50/40 to-slate-50 dark:from-red-950/20 dark:via-amber-950/10 dark:to-slate-900/80 border border-red-200/80 dark:border-red-900/40 shadow-sm hover:shadow-md transition-all not-prose"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-red-500/30">
                <FileText className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {cleanLabel}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Google Drive Attached File (PDF / Document)
                </span>
              </span>
            </span>

            <span className="flex items-center gap-2 flex-shrink-0 ml-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDocPreviewSrc(srcOrUrl);
                  setDocPreviewName(cleanLabel);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview in App</span>
              </button>

              <a
                href={srcOrUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-colors"
                title="Open in Google Drive"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </span>
          </span>
        );
      } else {
        // Standard Web Link
        parts.push(
          <a
            key={`${keyPrefix}-link-${tokenMatch.index}`}
            href={srcOrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-1 mx-0.5"
          >
            <span>{cleanLabel}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }

      currentIdx = mediaAndLinkRegex.lastIndex;
    }

    if (currentIdx < text.length) {
      parts.push(...renderInlineMathAndFormatting(text.substring(currentIdx), `${keyPrefix}-txt-${currentIdx}`));
    }

    return parts;
  };

  // Helper for $math$ and bold/italic/code in-line
  const renderInlineMathAndFormatting = (plain: string, keyPrefix: string): React.ReactNode[] => {
    const inlineMathRegex = /\$([^\$]+)\$/g;
    let idx = 0;
    let match: RegExpExecArray | null;
    const nodes: React.ReactNode[] = [];

    while ((match = inlineMathRegex.exec(plain)) !== null) {
      if (match.index > idx) {
        const textSlice = plain.substring(idx, match.index);
        nodes.push(
          <span key={`${keyPrefix}-sub-${idx}`} className="whitespace-pre-wrap">
            {textSlice}
          </span>
        );
      }
      const mathCode = match[1];
      nodes.push(
        <span key={`${keyPrefix}-math-${match.index}`} className="inline-block mx-0.5">
          <InlineMath math={mathCode} />
        </span>
      );
      idx = inlineMathRegex.lastIndex;
    }

    if (idx < plain.length) {
      nodes.push(
        <span key={`${keyPrefix}-sub-${idx}`} className="whitespace-pre-wrap">
          {plain.substring(idx)}
        </span>
      );
    }

    return nodes;
  };

  return (
    <>
      <div className={`prose max-w-none text-slate-800 dark:text-slate-100 ${className}`}>
        {segments.map((seg, i) => {
          if (seg.type === 'plot') {
            return <FunctionPlotRenderer key={`plot-${i}`} content={seg.value} />;
          }

          if (seg.type === 'mermaid') {
            return <MermaidRenderer key={`mermaid-${i}`} chart={seg.value} />;
          }

          if (seg.type === 'code') {
            return (
              <pre
                key={`code-${i}`}
                className="my-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800"
              >
                <code>{seg.value.trim()}</code>
              </pre>
            );
          }

          if (seg.type === 'math_block') {
            return (
              <div
                key={`block-${i}`}
                className="my-3 overflow-x-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center"
              >
                <BlockMath math={seg.value.trim()} />
              </div>
            );
          }

          return <React.Fragment key={`text-${i}`}>{renderRichText(seg.value, `seg-${i}`)}</React.Fragment>;
        })}
      </div>

      {/* Lightbox for clicked images */}
      <ImageLightboxModal
        isOpen={Boolean(lightboxSrc)}
        src={lightboxSrc || ''}
        alt={lightboxAlt}
        onClose={() => setLightboxSrc(null)}
      />

      {/* In-app Document & PDF Interactive Previewer Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(docPreviewSrc)}
        src={docPreviewSrc || ''}
        fileName={docPreviewName}
        onClose={() => setDocPreviewSrc(null)}
      />
    </>
  );
};
