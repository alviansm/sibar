'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AVAILABLE_GEMINI_MODELS } from '@/lib/gemini';
import { Sparkles, Upload, X, Loader2, Cpu, FileCode, CheckCircle2, ArrowRight, Layers } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { MathRenderer } from '@/components/MathRenderer';

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
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3.6-flash');
  const [targetType, setTargetType] = useState<'multiple_choice' | 'essay'>('multiple_choice');
  const [userInstructions, setUserInstructions] = useState('');
  const [stagedImage, setStagedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [extractedProblems, setExtractedProblems] = useState<any[]>([]);

  const resetModal = () => {
    setStep(1);
    setPreview(null);
    setStagedImage(null);
    setError('');
    setUserInstructions('');
    setExtractedProblems([]);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      setStagedImage({ base64, mimeType: file.type || 'image/png' });
    };
    reader.readAsDataURL(file);
  };

  const handleStartProcess = async () => {
    if (!stagedImage) {
      setError('Please select or upload a textbook exercise photo first.');
      return;
    }
    await processImage(stagedImage.base64, stagedImage.mimeType);
  };

  const processImage = async (base64: string, mimeType: string) => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/parse-problem-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [{ base64, mimeType }],
          targetProblemType: targetType,
          modelName: selectedModel,
          userInstructions: userInstructions.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to process textbook exercise image with Gemini AI.');
      }

      if (!json.data || json.data.length === 0) {
        throw new Error('Gemini could not detect clear exercise problem statements in the uploaded photo.');
      }

      setExtractedProblems(json.data);
      setStep(2); // Move to Step 2: Format Selection & Confirmation
    } catch (err: any) {
      setError(err.message || 'Error running Gemini AI OCR');
      toast('OCR Failed', err.message || 'Could not digitize textbook problem set page.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalImport = () => {
    // Transform extracted problems according to user selected targetType
    const formatted = extractedProblems.map((p) => ({
      ...p,
      problem_type: targetType,
      options: targetType === 'multiple_choice' ? (p.options && p.options.length === 4 ? p.options : ['Option A', 'Option B', 'Option C', 'Option D']) : null,
      correct_option_index: targetType === 'multiple_choice' ? (typeof p.correct_option_index === 'number' ? p.correct_option_index : 0) : null,
    }));

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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative space-y-6">
            
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
                  Step 2: Format &amp; Save
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {step === 1 ? 'Upload Textbook Problem Set Photo' : `Discovered ${extractedProblems.length} Exercise Problems`}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 1
                  ? 'Upload screenshots or photos of textbook exercise pages (e.g. Problem Set 0.4).'
                  : 'Select your preferred question format mode for this exercise set.'}
              </p>
            </div>

            {/* STEP 1: Upload & Model Selection */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Gemini Model</span>
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white"
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
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Custom AI Prompt / Instructions (Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={userInstructions}
                    onChange={(e) => setUserInstructions(e.target.value)}
                    disabled={loading}
                    placeholder='e.g. "Pick 5 hardest problems, 4 multiple choice, 1 essay" or "Make 10 similar problems based on this page"'
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500"
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

                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 hover:border-indigo-400 transition-colors relative bg-slate-50/50 dark:bg-slate-900/50">
                  {loading ? (
                    <div className="py-6 space-y-3">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Gemini AI is digesting textbook exercise page into LaTeX problem set...
                      </p>
                    </div>
                  ) : preview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block group">
                        <img src={preview} alt="Staged Upload Preview" className="max-h-44 mx-auto rounded-xl shadow-md border border-slate-200 dark:border-slate-700" />
                        <label className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold shadow-lg cursor-pointer flex items-center gap-1.5 transition-all">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Change Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Photo staged and ready. Add instructions above if needed.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200/60">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Upload Problem Set textbook page photo
                        </p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP screenshots supported</p>
                      </div>
                      <input
                        type="file"
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
                    disabled={!stagedImage || loading}
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
                        <span>Extract &amp; Generate Problems (Gemini AI)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Format Mode Selection & Preview */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Format Mode Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Select Exercise Question Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTargetType('multiple_choice')}
                      className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                        targetType === 'multiple_choice'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span>Multiple Choice</span>
                        {targetType === 'multiple_choice' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Interactive quiz format with choices and 1 correct answer key.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetType('essay')}
                      className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${
                        targetType === 'essay'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span>Essay / Freeform</span>
                        {targetType === 'essay' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Step-by-step problem statements with LaTeX solution keys.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Extracted Items Preview List */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Extracted Problems Preview ({extractedProblems.length})
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {extractedProblems.map((p, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="font-bold text-indigo-600 mr-2">#{i + 1}</span>
                        <MathRenderer content={p.problem_statement} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm Import Button */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Back to Photo
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
