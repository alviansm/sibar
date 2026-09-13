'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, CheckCircle2, AlertCircle, Sparkles, Loader2, Info, BookOpen, Layers } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { AiApiChecker } from '@/components/AiApiChecker';
import { updateAiModelAction } from '@/app/actions/user';

interface GeminiModel {
  id: string;
  name: string;
  description?: string;
}

interface AiSettingsFormProps {
  initialModel?: string;
}

export const AiSettingsForm: React.FC<AiSettingsFormProps> = ({ initialModel = 'gemini-2.5-flash' }) => {
  const { toast } = useToast();

  const [models, setModels] = useState<GeminiModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [activeSavedModel, setActiveSavedModel] = useState<string>(initialModel);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchModels = async (forceRefresh = false) => {
    setLoadingModels(true);
    setFetchError(null);
    try {
      const url = forceRefresh ? '/api/ai/models?refresh=true' : '/api/ai/models';
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Failed to retrieve available models.');
      }

      if (Array.isArray(json.models) && json.models.length > 0) {
        setModels(json.models);
      }
      if (json.currentModel) {
        setActiveSavedModel(json.currentModel);
        setSelectedModel(json.currentModel);
      }

      if (forceRefresh) {
        toast('Models Refreshed', `Synchronized ${json.models?.length || 0} active models directly from Google Gemini API.`, 'success');
      }
    } catch (err: any) {
      console.error('Error loading AI models:', err);
      setFetchError(err.message || 'Could not fetch dynamic models.');
      toast('Model Sync Warning', err.message || 'Could not reach Gemini model catalog. Defaulting to built-in fallbacks.', 'warning');
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModels(false);
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedModel) return;

    setSaving(true);
    try {
      const res = await updateAiModelAction(selectedModel);
      if (res.error) {
        toast('Save Failed', res.error, 'error');
      } else {
        setActiveSavedModel(selectedModel);
        toast('AI Model Saved', `Default digitizer model updated to "${selectedModel}".`, 'success');
      }
    } catch (err: any) {
      toast('Save Failed', err.message || 'Failed to update preferred AI model.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedModelObj = models.find((m) => m.id === selectedModel);

  return (
    <div className="space-y-8">
      {/* Model Selection Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Default AI Vision &amp; Digitizer Model</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select which Google Gemini model powers photo digitization across Concepts, Problem Sets, and Worked Examples.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchModels(true)}
            disabled={loadingModels}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
            title="Query Google Gemini API for newly released models"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{loadingModels ? 'Syncing Models...' : 'Sync with Gemini API'}</span>
          </button>
        </div>

        {fetchError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Note: {fetchError} Built-in models are available.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={loadingModels || saving}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 appearance-none pr-10"
              >
                {models.length === 0 ? (
                  <option value={selectedModel}>{selectedModel}</option>
                ) : (
                  models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id})
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            {selectedModelObj?.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic px-1">
                {selectedModelObj.description}
              </p>
            )}
          </div>

          {/* Model Status & Info Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Applied to Concepts
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Textbook photo transcription into LaTeX theorems &amp; definitions.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Applied to Problem Sets
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Exercise pages parsed into interactive LaTeX multiple choice &amp; essay questions.
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {activeSavedModel === selectedModel ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Current Active Model</span>
                </span>
              ) : (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Unsaved changes
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || activeSavedModel === selectedModel}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed m3-ripple"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Save Model Preference</span>
            </button>
          </div>
        </form>
      </div>

      {/* Embedded Live Connectivity Checker */}
      <AiApiChecker />
    </div>
  );
};
