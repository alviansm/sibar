'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  createProblemAction,
  updateProblemAction,
  deleteProblemAction,
  importProblemSetListAction,
} from '@/app/actions/problems';
import { createExerciseSetAction } from '@/app/actions/exercise';
import { MathRenderer } from '@/components/MathRenderer';
import { RichContentToolbar, handleClipboardImagePaste } from '@/components/RichContentToolbar';
import { GeminiOCRModal } from './GeminiOCRModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Eye,
  FileCode,
  CheckCircle2,
  Loader2,
  Sparkles,
  CheckSquare,
  Square,
  Upload,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface ProblemManagerWorkspaceProps {
  outlineId: string;
  slug: string;
  initialProblems: any[];
}

export const ProblemManagerWorkspace: React.FC<ProblemManagerWorkspaceProps> = ({
  outlineId,
  slug,
  initialProblems,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [statement, setStatement] = useState('');
  const [solution, setSolution] = useState('');
  const [problemType, setProblemType] = useState<
    'derivation' | 'calculation' | 'multiple_choice' | 'essay'
  >('multiple_choice');

  // Dynamic Options & Multiple Correct Answer Keys
  const [optionsList, setOptionsList] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>([0]);
  const [difficulty, setDifficulty] = useState(2);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [problemToDeleteId, setProblemToDeleteId] = useState<string | null>(null);

  // Exercise Creation Modal State
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseModalStep, setExerciseModalStep] = useState<'choice' | 'manual' | 'ai'>('choice');
  const [exerciseTitle, setExerciseTitle] = useState('');
  const [exerciseDescription, setExerciseDescription] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setStatement('');
    setSolution('');
    setProblemType('multiple_choice');
    setOptionsList(['', '', '', '']);
    setCorrectOptionIndices([0]);
    setDifficulty(2);
    setError('');
  };

  const handleEdit = (prob: any) => {
    setEditingId(prob.id);
    setStatement(prob.problem_statement);
    setSolution(prob.solution_guide);
    setProblemType(prob.problem_type);
    setDifficulty(prob.difficulty || 2);

    let parsedIndices: number[] = [0];
    if (prob.correct_option_indices) {
      try {
        const arr = JSON.parse(prob.correct_option_indices);
        if (Array.isArray(arr) && arr.length > 0) parsedIndices = arr;
      } catch (e) {}
    } else if (typeof prob.correct_option_index === 'number') {
      parsedIndices = [prob.correct_option_index];
    }
    setCorrectOptionIndices(parsedIndices);

    if (prob.options_json) {
      try {
        const arr = JSON.parse(prob.options_json);
        if (Array.isArray(arr) && arr.length > 0) {
          setOptionsList(arr);
        } else {
          setOptionsList(['', '', '', '']);
        }
      } catch {
        setOptionsList(['', '', '', '']);
      }
    } else {
      setOptionsList(['', '', '', '']);
    }

    setIsFormOpen(true);
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...optionsList];
    updated[index] = value;
    setOptionsList(updated);
  };

  const handleAddOptionChoice = () => {
    setOptionsList((prev) => [...prev, '']);
  };

  const handleRemoveOptionChoice = (index: number) => {
    if (optionsList.length <= 2) {
      toast('Min 2 Choices', 'Multiple choice questions require at least 2 options.', 'warning');
      return;
    }

    const updated = optionsList.filter((_, i) => i !== index);
    setOptionsList(updated);

    // Update indices after removal
    setCorrectOptionIndices((prev) =>
      prev
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
    );
  };

  const toggleCorrectIndex = (index: number) => {
    setCorrectOptionIndices((prev) => {
      if (prev.includes(index)) {
        if (prev.length <= 1) {
          toast('Min 1 Key', 'At least 1 option must be selected as correct.', 'warning');
          return prev;
        }
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index].sort((a, b) => a - b);
      }
    });
  };

  const handleBulkOCRImport = async (parsedProblems: any[]) => {
    setIsPending(true);
    const res = await importProblemSetListAction(outlineId, parsedProblems);
    setIsPending(false);

    if (res.error) {
      toast('Import Failed', res.error, 'error');
    } else {
      toast(
        'Problem Set Imported!',
        `Successfully digitized and created ${res.count} exercise problem reps.`,
        'success'
      );
    }
  };

  const handleCreateExerciseManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseTitle.trim()) return;

    setIsPending(true);
    // Insert the exercise_sets row first so the editor page can load it
    const res = await createExerciseSetAction(
      outlineId,
      exerciseTitle.trim(),
      exerciseDescription.trim(),
      70,
      true
    );
    setIsPending(false);
    setIsExerciseModalOpen(false);

    if (res.error) {
      toast('Creation Failed', res.error, 'error');
      return;
    }

    toast('Exercise Created', `Opening dedicated builder for "${exerciseTitle.trim()}"...`, 'success');
    setExerciseTitle('');
    setExerciseDescription('');
    router.push(`/projects/${slug}/outlines/${outlineId}/exercise/${res.id}`);
  };

  const handleCreateExerciseAIImport = async (parsedProblems: any[]) => {
    setIsPending(true);

    // Create the exercise_set row first
    const setRes = await createExerciseSetAction(
      outlineId,
      'Textbook Exercise Set',
      '',
      70,
      true
    );

    if (setRes.error) {
      setIsPending(false);
      setIsExerciseModalOpen(false);
      toast('Creation Failed', setRes.error, 'error');
      return;
    }

    const exerciseId = setRes.id!;

    // Bulk-import the AI-parsed problems under this exercise set
    const res = await importProblemSetListAction(outlineId, parsedProblems, exerciseId, 'exercise');
    setIsPending(false);
    setIsExerciseModalOpen(false);

    if (res.error) {
      toast('Import Failed', res.error, 'error');
    } else {
      toast('Exercise Set Created', `Digitized ${res.count} questions into exercise set.`, 'success');
      router.push(`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsPending(true);

    const validOptions =
      problemType === 'multiple_choice'
        ? optionsList.map((o) => o.trim()).filter((o) => o.length > 0)
        : null;

    if (problemType === 'multiple_choice' && (!validOptions || validOptions.length < 2)) {
      setIsPending(false);
      setError('Please provide at least 2 choice options for Multiple Choice Quiz format.');
      return;
    }

    const firstIndex = correctOptionIndices[0] ?? 0;

    if (editingId) {
      const res = await updateProblemAction(
        editingId,
        statement,
        solution,
        problemType,
        validOptions,
        firstIndex,
        difficulty,
        correctOptionIndices
      );
      setIsPending(false);

      if (res.error) {
        setError(res.error);
        toast('Update Error', res.error, 'error');
      } else {
        toast('Problem Updated', 'Saved problem rep changes successfully.', 'success');
        setIsFormOpen(false);
        resetForm();
      }
    } else {
      const res = await createProblemAction(
        outlineId,
        statement,
        solution,
        problemType,
        validOptions,
        firstIndex,
        difficulty,
        correctOptionIndices
      );
      setIsPending(false);

      if (res.error) {
        setError(res.error);
        toast('Creation Error', res.error, 'error');
      } else {
        toast('Problem Created', 'Added new problem rep to subchapter set.', 'success');
        setIsFormOpen(false);
        resetForm();
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!problemToDeleteId) return;
    setIsPending(true);
    const res = await deleteProblemAction(problemToDeleteId);
    setIsPending(false);
    setProblemToDeleteId(null);

    if (res.error) {
      toast('Delete Failed', res.error, 'error');
    } else {
      toast('Problem Deleted', 'Soft-deleted problem rep from workspace.', 'info');
    }
  };

  return (
    <div className="space-y-8">
      {/* Workspace Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-600" />
            <span>Subchapter Problem Set ({initialProblems.length})</span>
          </h2>
          <p className="text-xs text-slate-500">
            Create single concept problem reps or generate full exercise sets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* AI Generator for Single Problem */}
          <GeminiOCRModal onBulkImport={handleBulkOCRImport} label="Single Problem AI Generator" />

          {/* Add Exercise Set Modal Trigger */}
          <button
            onClick={() => {
              setExerciseModalStep('choice');
              setExerciseTitle('');
              setIsExerciseModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all m3-ripple"
          >
            <Layers className="w-4 h-4" />
            <span>Add Exercise Set</span>
          </button>

          {/* Relabeled Button: Add A Problem */}
          <button
            onClick={() => {
              resetForm();
              setProblemType('calculation');
              setIsFormOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Add A Problem</span>
          </button>
        </div>
      </div>

      {/* Add Exercise Set Modal Prompt */}
      {isExerciseModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
            <button
              onClick={() => setIsExerciseModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create New Exercise Set</h3>
              <p className="text-xs text-slate-500">
                How would you like to build this exercise set for your subchapter?
              </p>
            </div>

            {exerciseModalStep === 'choice' && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setExerciseModalStep('manual')}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-indigo-500 text-left space-y-1 transition-all group"
                >
                  <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white">
                    <span>Add Manually</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Set a title and build exercise questions manually on a dedicated page.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setExerciseModalStep('ai')}
                  className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:border-indigo-500 text-left space-y-1 transition-all group"
                >
                  <div className="flex items-center justify-between font-bold text-xs text-indigo-900 dark:text-indigo-200">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>AI Generated (Textbook Photo OCR)</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Upload textbook page photo and let Gemini AI parse the exercise questions.
                  </p>
                </button>
              </div>
            )}

            {exerciseModalStep === 'manual' && (
              <form onSubmit={handleCreateExerciseManual} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Exercise Set Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={exerciseTitle}
                    onChange={(e) => setExerciseTitle(e.target.value)}
                    placeholder="e.g. Problem Set 0.4: Graphing Equations"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={exerciseDescription}
                    onChange={(e) => setExerciseDescription(e.target.value)}
                    rows={2}
                    placeholder="Brief instructions or context for students…"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setExerciseModalStep('choice')}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !exerciseTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isPending ? 'Creating…' : 'Open Dedicated Page'}</span>
                  </button>
                </div>
              </form>
            )}

            {exerciseModalStep === 'ai' && (
              <div className="space-y-4">
                <GeminiOCRModal
                  onBulkImport={handleCreateExerciseAIImport}
                  label="Upload Exercise Page Photo"
                />
                <button
                  type="button"
                  onClick={() => setExerciseModalStep('choice')}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:underline"
                >
                  Cancel &amp; Back
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Interactive Form Drawer for Adding/Editing Problems */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>{editingId ? 'Edit Problem Rep' : 'Create New Problem Rep'}</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Problem Format Type
              </label>
              <select
                value={problemType}
                onChange={(e) => setProblemType(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="multiple_choice">Multiple Choice Quiz</option>
                <option value="essay">Essay / Freeform Response</option>
                <option value="calculation">Calculation Rep</option>
                <option value="derivation">Mathematical Derivation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Difficulty Level (1 to 5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Statement & Live KaTeX Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Problem Statement (LaTeX, Plots, Diagrams & Images)
                </label>
              </div>
              <RichContentToolbar
                onInsert={(snippet) => setStatement((prev) => prev + snippet)}
                className="mb-1"
              />
              <textarea
                rows={6}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                onPaste={(e) =>
                  handleClipboardImagePaste(
                    e,
                    (snippet) => setStatement((prev) => prev + snippet),
                    toast
                  )
                }
                required
                placeholder="e.g. Find the points of intersection of $y = -x + 1$ and $y = (x + 1)^2$."
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Rich Statement Preview</span>
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 min-h-[140px] text-xs leading-relaxed text-slate-800 dark:text-slate-200 overflow-y-auto max-h-96">
                {statement ? (
                  <MathRenderer content={statement} />
                ) : (
                  <span className="text-slate-400 italic">Statement, graphs, and images will render here...</span>
                )}
              </div>
            </div>
          </div>

          {/* Multiple Correct Answers Multiple Choice Option Builder */}
          {problemType === 'multiple_choice' && (
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Multiple Choice Options ({optionsList.length} Choices)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Provide each option in its own input field. Toggle checkmarks on the right to select one or multiple correct answers.
                  </p>
                </div>
              </div>

              {/* Dynamic Option Rows */}
              <div className="space-y-3">
                {optionsList.map((optVal, idx) => {
                  const isCorrect = correctOptionIndices.includes(idx);
                  const labelLetter = String.fromCharCode(65 + idx);

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border transition-all ${
                        isCorrect
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono border border-slate-200 dark:border-slate-700">
                        {labelLetter}
                      </span>

                      <input
                        type="text"
                        value={optVal}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Option ${labelLetter} statement (e.g. $(0, 1)$)`}
                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />

                      {/* Multiple Correct Selection Checkbox Pill */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => toggleCorrectIndex(idx)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isCorrect
                              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isCorrect ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          <span>{isCorrect ? 'Correct Key' : 'Set as Correct'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveOptionChoice(idx)}
                          disabled={optionsList.length <= 2}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove option choice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Option Choice Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddOptionChoice}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Option Choice</span>
                </button>
              </div>
            </div>
          )}

          {/* Solution Guide */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reference Solution Guide &amp; Key Steps (LaTeX, Plots &amp; Diagrams)
              </label>
            </div>
            <RichContentToolbar
              onInsert={(snippet) => setSolution((prev) => prev + snippet)}
              className="mb-1"
            />
            <textarea
              rows={5}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              onPaste={(e) =>
                handleClipboardImagePaste(
                  e,
                  (snippet) => setSolution((prev) => prev + snippet),
                  toast
                )
              }
              required
              placeholder="e.g. Set equations equal: $-x + 1 = (x + 1)^2$. Expand: $-x + 1 = x^2 + 2x + 1 \implies x^2 + 3x = 0$."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
            />
            {solution.trim() && (
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs max-h-96 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Live Solution Preview</div>
                <MathRenderer content={solution} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{editingId ? 'Save Problem Rep' : 'Create Problem Rep'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Problems List Cards */}
      {initialProblems.length === 0 ? (
        <LottieEmptyState
          title="No Problem Reps Added Yet"
          message="Use AI Problem Generators or add problems manually to build your subchapter set."
        />
      ) : (
        <div className="space-y-4">
          {initialProblems.map((prob, idx) => (
            <div
              key={prob.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono">
                    {prob.problem_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-amber-500 font-bold font-mono">
                    Diff {prob.difficulty}/5
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(prob)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setProblemToDeleteId(prob.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <MathRenderer content={prob.problem_statement} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Soft Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(problemToDeleteId)}
        title="Delete Problem Rep"
        message="Are you sure you want to remove this problem rep from the subchapter set?"
        confirmText="Soft Delete Problem"
        danger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setProblemToDeleteId(null)}
      />
    </div>
  );
};
