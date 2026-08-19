'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AVAILABLE_GEMINI_MODELS } from '@/lib/gemini';
import { Sparkles, Upload, X, Loader2, Cpu, FileCode, CheckCircle2, ArrowRight, Layers, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { MathRenderer } from '@/components/MathRenderer';

interface StagedPhoto {
  id: string;
  base64: string;
  mimeType: string;
  name?: string;
}

interface GeminiOCRModalProps {
  onBulkImport: (parsedProblems: any[]) => void;
  label?: string;
}

export const GeminiOCRModal: React.FC<GeminiOCRModalProps> = ({ onBulkImport, label }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash');
  const [targetType, setTargetType] = useState<'multiple_choice' | 'essay'>('multiple_choice');
  const [userInstructions, setUserInstructions] = useState('');
  const [stagedImages, setStagedImages] = useState<StagedPhoto[]>([]);
  const [extractedProblems, setExtractedProblems] = useState<any[]>([]);
  const [selectionRationale, setSelectionRationale] = useState<string | null>(null);

  const resetModal = () => {
    setStep(1);
    setStagedImages([]);
    setError('');
    setUserInstructions('');
    setExtractedProblems([]);
    setSelectionRationale(null);
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
      setError('Please select or upload at least one textbook exercise photo first.');
      return;
    }
    await processImages(stagedImages);
  };

  const processImages = async (photos: StagedPhoto[]) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/parse-problem-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: photos.map((p) => ({ base64: p.base64, mimeType: p.mimeType })),
          targetProblemType: targetType,
          modelName: selectedModel,
          userInstructions: userInstructions.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to process textbook exercise image(s) with Gemini AI.');
      }

      if (!json.data || json.data.length === 0) {
        throw new Error('Gemini could not detect clear exercise problem statements in the uploaded photo(s).');
      }

      setExtractedProblems(json.data);
      setSelectionRationale(json.rationale || null);
      setStep(2); // Move to Step 2: Review & Save
    } catch (err: any) {
      setError(err.message || 'Error running Gemini AI OCR');
      toast('OCR Failed', err.message || 'Could not digitize textbook problem set page(s).', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalImport = () => {
    // Transform extracted problems according to targetType
    const formatted = extractedProblems.map((p) => {
      const isMcq = p.problem_type === 'multiple_choice' || (Array.isArray(p.options) && p.options.length >= 2);
      if (isMcq || targetType === 'multiple_choice') {
        const hasValidOpts = Array.isArray(p.options) && p.options.length >= 2;
        const options = hasValidOpts ? p.options : ['Option A', 'Option B', 'Option C', 'Option D'];
        const correct_option_index =
          typeof p.correct_option_index === 'number' &&
          p.correct_option_index >= 0 &&
          p.correct_option_index < options.length
            ? p.correct_option_index
            : 0;

        return {
          ...p,
          problem_type: 'multiple_choice' as const,
          options,
          correct_option_index,
        };
      }

      return {
        ...p,
        problem_type: 'essay' as const,
        options: null,
        correct_option_index: null,
      };
    });

    onBulkImport(formatted);
    setIsOpen(false);
    resetModal();
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
        <span>{label || 'Gemini AI Textbook Digitizer'}</span>
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
                  Step 1: Upload &amp; Configure
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  Step 2: Review &amp; Save
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {step === 1
                  ? stagedImages.length > 1
                    ? `Upload Textbook Photos (${stagedImages.length} staged)`
                    : 'Upload Textbook Problem Set Photo(s)'
                  : `Discovered ${extractedProblems.length} Exercise Problems`}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 1
                  ? 'Upload photos, select your question format, and add optional AI instructions.'
                  : 'Review extracted questions and pedagogical rationale before saving.'}
              </p>
            </div>

            {/* STEP 1: Upload & Model Selection & Format Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Gemini Model</span>
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      disabled={loading}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {AVAILABLE_GEMINI_MODELS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Question Format Mode</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setTargetType('multiple_choice')}
                        disabled={loading}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          targetType === 'multiple_choice'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <span>Multiple Choice</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetType('essay')}
                        disabled={loading}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          targetType === 'essay'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <span>Essay / Freeform</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Custom AI Prompt / Instructions (Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={userInstructions}
                    onChange={(e) => setUserInstructions(e.target.value)}
                    disabled={loading}
                    placeholder='e.g. "Pick 20 most important questions", "5 hardest problems with tricky distractors", or "Make variant questions based on these pages"'
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {error && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs leading-relaxed space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-200">
                      <span>🔑 API Key Required / Invalid</span>
                    </div>
                    <p>{error}</p>
                  </div>
                )}

                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-5 text-center space-y-4 hover:border-indigo-400 transition-colors relative bg-slate-50/50 dark:bg-slate-900/50">
                  {loading ? (
                    <div className="py-8 space-y-3">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Gemini AI is digesting {stagedImages.length} textbook page photo{stagedImages.length === 1 ? '' : 's'} into {targetType === 'multiple_choice' ? 'multiple choice' : 'essay'} problem set...
                      </p>
                    </div>
                  ) : stagedImages.length > 0 ? (
                    <div className="space-y-3">
                      {/* Grid of staged photos */}
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
                            {/* Overlay Top & Bottom */}
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
                                  className="p-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition-colors shadow-sm"
                                  title="Remove photo"
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

                        {/* Add More Photos Card in the Grid */}
                        <label className="relative rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 aspect-video flex flex-col items-center justify-center gap-1 cursor-pointer transition-all group">
                          <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            Add Photo
                          </span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs px-1">
                        <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{stagedImages.length} photo{stagedImages.length === 1 ? '' : 's'} staged &amp; ready</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setStagedImages([])}
                          className="text-slate-400 hover:text-rose-500 text-[11px] font-medium transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200/60">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Upload Problem Set textbook page photos
                        </p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP screenshots supported (Select one or multiple)</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </>
                  )}
                </div>

                {/* Explicit Process Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleStartProcess}
                    disabled={stagedImages.length === 0 || loading}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed m3-ripple"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing with Gemini AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {stagedImages.length > 1
                            ? `Extract & Generate Problems (${stagedImages.length} Photos - Gemini AI)`
                            : `Extract & Generate Problems (Gemini AI)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Review & Save */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* AI Rationale / Explanation Card */}
                {selectionRationale && (
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>AI Selection &amp; Prompt Rationale</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {selectionRationale}
                    </p>
                  </div>
                )}

                {/* Extracted Items Preview List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Extracted Problems Preview ({extractedProblems.length})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                      Format: {targetType === 'multiple_choice' ? 'Multiple Choice' : 'Essay / Freeform'}
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {extractedProblems.map((p, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                        <div>
                          <span className="font-bold text-indigo-600 mr-2">#{i + 1}</span>
                          <MathRenderer content={p.problem_statement} />
                        </div>

                        {/* Multiple Choice Options Preview */}
                        {p.options && Array.isArray(p.options) && p.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                            {p.options.map((opt: string, optIdx: number) => {
                              const isCorrect = (typeof p.correct_option_index === 'number' ? p.correct_option_index : 0) === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] flex items-center gap-1.5 transition-colors ${
                                    isCorrect
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50'
                                  }`}
                                >
                                  <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span className="truncate flex-1"><MathRenderer content={opt} /></span>
                                  {isCorrect && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                      ✓ Key
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Essay / Derivation Solution Guide Preview */}
                        {(!p.options || p.problem_type === 'essay' || targetType === 'essay') && p.solution_guide && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Solution Guide:</span>
                            <MathRenderer content={p.solution_guide} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm Import Button */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Back to Edit &amp; Photos
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalImport}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save {extractedProblems.length} Exercises to Subchapter</span>
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
