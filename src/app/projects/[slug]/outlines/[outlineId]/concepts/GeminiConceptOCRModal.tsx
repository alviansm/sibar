'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Sparkles, Upload, X, Loader2, Cpu, ArrowRight, BookOpen, Trash2, CheckCircle2, FileText } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { MathRenderer } from '@/components/MathRenderer';

interface StagedPhoto {
  id: string;
  base64: string;
  mimeType: string;
  name?: string;
}

interface GeminiConceptOCRModalProps {
  onImportConcepts: (concepts: { title: string; content: string }[]) => void;
  label?: string;
}

export const GeminiConceptOCRModal: React.FC<GeminiConceptOCRModalProps> = ({
  onImportConcepts,
  label = 'AI Photo Digitizer',
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userInstructions, setUserInstructions] = useState('');
  const [stagedImages, setStagedImages] = useState<StagedPhoto[]>([]);
  const [extractedConcepts, setExtractedConcepts] = useState<Array<{ title: string; content: string }>>([]);

  const resetModal = () => {
    setStep(1);
    setStagedImages([]);
    setError('');
    setUserInstructions('');
    setExtractedConcepts([]);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    const fileList = Array.from(files);

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setStagedImages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
            base64,
            mimeType: file.type || 'image/png',
            name: file.name,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemovePhoto = (id: string) => {
    setStagedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleStartProcess = async () => {
    if (stagedImages.length === 0) {
      setError('Please select or upload at least one textbook or lecture notes photo first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/parse-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: stagedImages.map((p) => ({ base64: p.base64, mimeType: p.mimeType })),
          userInstructions: userInstructions.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to extract concepts from photo.');
      }

      if (!json.data || json.data.length === 0) {
        throw new Error('No clear theoretical concepts or formulas detected in the uploaded photo.');
      }

      setExtractedConcepts(json.data);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error running concept OCR');
      toast('Digitization Failed', err.message || 'Could not parse concepts from photo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConcept = (index: number) => {
    setExtractedConcepts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConceptChange = (index: number, field: 'title' | 'content', value: string) => {
    setExtractedConcepts((prev) =>
      prev.map((c, idx) => (idx === index ? { ...c, [field]: value } : c))
    );
  };

  const handleFinalImport = () => {
    const valid = extractedConcepts.filter((c) => c.title.trim() && c.content.trim());
    if (valid.length === 0) {
      toast('Empty Concepts', 'No valid concepts to import.', 'warning');
      return;
    }

    onImportConcepts(valid);
    setIsOpen(false);
    resetModal();
    toast('Concepts Imported', `Successfully added ${valid.length} concept card${valid.length === 1 ? '' : 's'}.`, 'success');
  };

  return (
    <>
      <button
        onClick={() => {
          resetModal();
          setIsOpen(true);
        }}
        className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all m3-ripple"
      >
        <Sparkles className="w-4 h-4" />
        <span>{label}</span>
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                if (!loading) {
                  setIsOpen(false);
                  resetModal();
                }
              }}
              disabled={loading}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Step Wizard Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  Step 1: Upload Photo
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  Step 2: Review &amp; Import
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {step === 1 ? 'Digitize Concepts from Textbook Photo' : `Discovered ${extractedConcepts.length} Concept Cards`}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {step === 1
                  ? 'Upload photos of textbook theory, theorem proofs, or formulas to automatically extract structured concept cards.'
                  : 'Review the extracted theory and LaTeX formulas before saving.'}
              </p>
            </div>

            {/* Step 1: Upload and Configure */}
            {step === 1 && (
              <div className="space-y-4">
                {/* AI Model Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800 flex-shrink-0">
                      <Cpu className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Digitizing with AI model configured in <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">Settings</strong>
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/settings?tab=ai"
                    target="_blank"
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>Change Model</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Optional Instructions */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Custom Instructions / Focus (Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={userInstructions}
                    onChange={(e) => setUserInstructions(e.target.value)}
                    disabled={loading}
                    placeholder='e.g. "Focus on theorem proofs and state definitions formally with LaTeX"'
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {error && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                    <p>{error}</p>
                  </div>
                )}

                {/* Photo Dropzone */}
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-5 text-center space-y-4 hover:border-indigo-400 transition-colors relative bg-slate-50/50 dark:bg-slate-900/50">
                  {loading ? (
                    <div className="py-8 space-y-3">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Gemini AI is parsing concepts and equations from {stagedImages.length} photo{stagedImages.length === 1 ? '' : 's'}...
                      </p>
                    </div>
                  ) : stagedImages.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                        {stagedImages.map((img, idx) => (
                          <div
                            key={img.id}
                            className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm aspect-video flex flex-col justify-between"
                          >
                            <img
                              src={img.base64}
                              alt={img.name || `Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/70 p-2 flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-bold">
                                  #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemovePhoto(img.id);
                                  }}
                                  className="p-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-[10px] text-slate-200 truncate text-left font-medium">
                                {img.name || `Page ${idx + 1}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center justify-center gap-3">
                        <label className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Add More Photos</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 py-6">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200/60 dark:border-indigo-800">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Upload Textbook Theory or Lecture Photo(s)
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Select one or multiple photos of textbook pages or written notes
                        </p>
                      </div>
                      <label className="inline-flex px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-md shadow-indigo-600/20">
                        <span>Browse Images</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      resetModal();
                    }}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartProcess}
                    disabled={loading || stagedImages.length === 0}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed m3-ripple"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Digitize Concepts with Gemini</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review and Import */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {extractedConcepts.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleConceptChange(idx, 'title', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                            placeholder="Concept Title"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveConcept(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove concept"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <textarea
                          rows={4}
                          value={item.content}
                          onChange={(e) => handleConceptChange(idx, 'content', e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono resize-y"
                        />
                      </div>

                      {/* Live LaTeX Preview */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Rendered Preview:
                        </span>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                          <MathRenderer content={item.content} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Back to Photos
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalImport}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all m3-ripple"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import {extractedConcepts.length} Concepts</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
