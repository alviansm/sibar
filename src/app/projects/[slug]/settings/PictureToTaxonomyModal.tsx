'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { importTaxonomyAction } from '@/app/actions/projects';
import { useToast } from '@/components/Toast';
import { AVAILABLE_GEMINI_MODELS } from '@/lib/gemini';
import { Sparkles, Upload, X, Loader2, Image as ImageIcon, CheckSquare, Square, Cpu, Trash2 } from 'lucide-react';

interface PictureToTaxonomyModalProps {
  projectId: string;
}

const compressImage = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1600;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ base64: compressedBase64, mimeType: 'image/jpeg' });
        } else {
          resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/png' });
        }
      };
      img.onerror = () => {
        resolve({ base64: e.target?.result as string, mimeType: file.type || 'image/png' });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const PictureToTaxonomyModal: React.FC<PictureToTaxonomyModalProps> = ({ projectId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [images, setImages] = useState<{ base64: string; mimeType: string }[]>([]);
  const [generateProblems, setGenerateProblems] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash');
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const compressed = await compressImage(file);
      setImages((prev) => [...prev, compressed]);
    }

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcessTaxonomy = async () => {
    if (images.length === 0) {
      toast('No Image Selected', 'Please upload at least one textbook Table of Contents or syllabus image.', 'warning');
      return;
    }

    setLoading(true);

    try {
      // 1. Send image(s) and selected model to AI parsing API
      const res = await fetch('/api/ai/parse-taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, generateProblems, modelName: selectedModel }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        toast('Syllabus Image Error', json.error || 'Failed to parse image into taxonomy.', 'error');
        setLoading(false);
        return;
      }

      const chaptersData = json.data;
      if (!chaptersData || chaptersData.length === 0) {
        toast('No Chapters Found', 'Gemini could not detect any chapter hierarchy in the uploaded image(s).', 'warning');
        setLoading(false);
        return;
      }

      // 2. Save parsed taxonomy directly to database
      const dbRes = await importTaxonomyAction(projectId, chaptersData, generateProblems);

      setLoading(false);

      if (dbRes.error) {
        toast('Database Import Error', dbRes.error, 'error');
      } else {
        toast(
          'Taxonomy Auto-Generated!',
          `Successfully created ${dbRes.chaptersCount} chapters and ${dbRes.subchaptersCount} subchapters${
            dbRes.problemsCount ? ` with ${dbRes.problemsCount} initial problem reps` : ''
          }.`,
          'success',
          6000
        );
        setIsOpen(false);
        setImages([]);
      }
    } catch (err: any) {
      setLoading(false);
      toast('AI Processing Failed', err.message || 'An unexpected error occurred while processing image.', 'error');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all m3-ripple"
      >
        <Sparkles className="w-4 h-4 text-white" />
        <span>Picture to Taxonomy</span>
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => {
                if (!loading) setIsOpen(false);
              }}
              disabled={loading}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Picture to Taxonomy AI Converter
              </h3>
              <p className="text-xs text-slate-500">
                Upload photos or screenshots of textbook Table of Contents. Gemini AI will parse chapters, subchapters, and topic descriptions automatically.
              </p>
            </div>

            {/* AI Model Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Select Gemini Model</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {AVAILABLE_GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Uploader & Thumbnails */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-3 relative bg-slate-50/50 dark:bg-slate-900/50 hover:border-indigo-400 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200/60">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Upload Table of Contents Image(s)
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Select single or multi-page Table of Contents screenshots</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={loading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
              </div>

              {/* Thumbnails Preview List */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Uploaded Pages ({images.length})
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100">
                        <img src={img.base64} alt={`TOC Page ${i + 1}`} className="w-full h-24 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          disabled={loading}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox Option: Auto-generate problem sets for each subchapter */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-3">
              <button
                type="button"
                onClick={() => setGenerateProblems(!generateProblems)}
                disabled={loading}
                className="mt-0.5 text-indigo-600 dark:text-indigo-400 focus:outline-none"
              >
                {generateProblems ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
              </button>
              <div className="space-y-0.5 cursor-pointer select-none" onClick={() => setGenerateProblems(!generateProblems)}>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Auto-generate problem sets taxonomy for each subchapter
                </p>
                <p className="text-[11px] text-slate-500">
                  If enabled, Gemini will generate initial LaTeX derivation and calculation problem reps + solution keys for every subchapter node.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessTaxonomy}
                disabled={loading || images.length === 0}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gemini AI Digesting Hierarchy...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Taxonomy Tree</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};
