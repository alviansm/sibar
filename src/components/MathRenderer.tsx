'use client';

import React, { useState } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { MermaidRenderer } from './MermaidRenderer';
import { FunctionPlotRenderer } from './FunctionPlotRenderer';
import { ImageLightboxModal } from './ImageLightboxModal';
import { Maximize2 } from 'lucide-react';

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

  // 2. Helper to render text with Markdown images (![alt](url)), inline math ($...$), and basic markdown
  const renderRichText = (text: string, keyPrefix: string) => {
    // Split by images ![alt](url) first
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imgIdx = 0;
    let imgMatch: RegExpExecArray | null;
    const parts: React.ReactNode[] = [];

    while ((imgMatch = imgRegex.exec(text)) !== null) {
      if (imgMatch.index > imgIdx) {
        const precedingText = text.substring(imgIdx, imgMatch.index);
        parts.push(...renderInlineMathAndFormatting(precedingText, `${keyPrefix}-txt-${imgIdx}`));
      }

      const alt = imgMatch[1] || 'Diagram';
      const src = imgMatch[2];

      parts.push(
        <span
          key={`${keyPrefix}-img-${imgMatch.index}`}
          className="group relative my-3 inline-block max-w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 cursor-pointer"
          onClick={() => {
            setLightboxSrc(src);
            setLightboxAlt(alt);
          }}
        >
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="max-h-96 max-w-full object-contain rounded-xl transition-transform duration-200 group-hover:scale-[1.01]"
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

      imgIdx = imgRegex.lastIndex;
    }

    if (imgIdx < text.length) {
      parts.push(...renderInlineMathAndFormatting(text.substring(imgIdx), `${keyPrefix}-txt-${imgIdx}`));
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
    </>
  );
};
