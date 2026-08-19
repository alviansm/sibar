'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, ExternalLink } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  src,
  alt = 'Image preview',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
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

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.3, 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.3, 0.5));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top action bar */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-2xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          title="Reset Zoom"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors text-xs font-mono"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-700 mx-1" />
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          title="Open Original"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href={src}
          download
          title="Download"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          onClick={onClose}
          title="Close (Esc)"
          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-full transition-colors ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image container with scale & drag-like transform */}
      <div
        className="relative max-w-full max-h-[85vh] flex items-center justify-center overflow-auto p-2 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out' }}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl select-none"
        />
      </div>

      {alt && (
        <div
          className="absolute bottom-4 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs text-slate-300 shadow-xl max-w-[80vw] truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {alt}
        </div>
      )}
    </div>,
    document.body
  );
};
