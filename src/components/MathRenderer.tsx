'use client';

import React from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split by $$ display math first, then by $ inline math
  const parts: React.ReactNode[] = [];
  
  // Regex to tokenize $$...$$ block math and $...$ inline math
  const blockRegex = /\$\$([\s\S]*?)\$\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Process text into block segments
  const segments: { type: 'text' | 'block'; value: string }[] = [];

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }
    segments.push({ type: 'block', value: match[1] });
    lastIndex = blockRegex.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.substring(lastIndex) });
  }

  // Helper to render text containing $...$ inline math
  const renderInlineText = (text: string, keyPrefix: string) => {
    const inlineRegex = /\$([^\$]+)\$/g;
    let idx = 0;
    let inlineMatch: RegExpExecArray | null;
    const inlineNodes: React.ReactNode[] = [];

    while ((inlineMatch = inlineRegex.exec(text)) !== null) {
      if (inlineMatch.index > idx) {
        const plainStr = text.substring(idx, inlineMatch.index);
        inlineNodes.push(
          <span key={`${keyPrefix}-txt-${idx}`} className="whitespace-pre-wrap">
            {plainStr}
          </span>
        );
      }
      const mathCode = inlineMatch[1];
      inlineNodes.push(
        <span key={`${keyPrefix}-math-${inlineMatch.index}`} className="inline-block mx-0.5">
          <InlineMath math={mathCode} />
        </span>
      );
      idx = inlineRegex.lastIndex;
    }

    if (idx < text.length) {
      inlineNodes.push(
        <span key={`${keyPrefix}-txt-${idx}`} className="whitespace-pre-wrap">
          {text.substring(idx)}
        </span>
      );
    }

    return inlineNodes;
  };

  return (
    <div className={`prose max-w-none text-slate-800 dark:text-slate-100 ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'block') {
          return (
            <div key={`block-${i}`} className="my-3 overflow-x-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-center">
              <BlockMath math={seg.value.trim()} />
            </div>
          );
        }
        return <React.Fragment key={`text-${i}`}>{renderInlineText(seg.value, `seg-${i}`)}</React.Fragment>;
      })}
    </div>
  );
};
