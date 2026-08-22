'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { cryptoNativeUUID } from '@/lib/utils';
import { AlertCircle, Copy, Check } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, className = '' }) => {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const isDark = resolvedTheme === 'dark';

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'neutral',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        themeVariables: isDark
          ? {
              primaryColor: '#3b82f6',
              primaryTextColor: '#f8fafc',
              primaryBorderColor: '#60a5fa',
              lineColor: '#94a3b8',
              secondaryColor: '#1e293b',
              tertiaryColor: '#0f172a',
            }
          : {
              primaryColor: '#2563eb',
              primaryTextColor: '#0f172a',
              primaryBorderColor: '#3b82f6',
              lineColor: '#64748b',
              secondaryColor: '#f1f5f9',
              tertiaryColor: '#ffffff',
            },
      });

      const uniqueId = `mermaid-${cryptoNativeUUID().replace(/[^a-zA-Z0-9]/g, '')}`;
      const cleanChart = chart.trim();

      if (!cleanChart) {
        setSvgContent('');
        return;
      }

      mermaid
        .render(uniqueId, cleanChart)
        .then(({ svg }) => {
          if (isMounted) {
            setSvgContent(svg);
            setError(null);
          }
        })
        .catch((err) => {
          console.error('Mermaid render error:', err);
          if (isMounted) {
            setError(err?.message || 'Failed to render diagram');
          }
        });
    } catch (err: any) {
      if (isMounted) {
        setError(err?.message || 'Mermaid initialization error');
      }
    }

    return () => {
      isMounted = false;
    };
  }, [chart, resolvedTheme]);


  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="my-3 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs">
        <div className="flex items-center gap-1.5 font-medium mb-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Diagram Render Error</span>
        </div>
        <pre className="font-mono text-[11px] overflow-x-auto p-2 bg-rose-100/50 dark:bg-rose-900/20 rounded border border-rose-200/50 dark:border-rose-800/40">
          {chart}
        </pre>
      </div>
    );
  }

  return (
    <div className={`relative group my-3 overflow-x-auto p-4 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col items-center justify-center ${className}`}>
      <button
        onClick={handleCopy}
        title="Copy diagram source"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {svgContent ? (
        <div
          ref={containerRef}
          className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      ) : (
        <div className="py-6 text-xs text-slate-400 font-mono animate-pulse">Rendering diagram...</div>
      )}
    </div>
  );
};
