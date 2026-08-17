'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  createProblemAction,
  updateProblemAction,
  deleteProblemAction,
  importProblemSetListAction,
} from '@/app/actions/problems';
import { useRouter } from 'next/navigation';
import { updateExerciseSetAction, deleteExerciseSetAction } from '@/app/actions/exercise';
import { MathRenderer } from '@/components/MathRenderer';
import { GeminiOCRModal } from '../../GeminiOCRModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  FileCode,
  CheckCircle2,
  Loader2,
  Sparkles,
  CheckSquare,
  Square,
  Layers,
  Award,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ExerciseEditorWorkspaceProps {
  outlineId: string;
  exerciseId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  parentChapter?: { id: string; code: string; title: string } | null;
  exerciseTitle: string;
  exerciseDescription: string;
  passingGrade: number;
  isTimed: boolean;
  initialProblems: any[];
}

export const ExerciseEditorWorkspace: React.FC<ExerciseEditorWorkspaceProps> = ({
  outlineId,
  exerciseId,
  slug,
  projectTitle,
  subchapterCode,
  subchapterTitle,
  parentChapter,
  exerciseTitle: initialExerciseTitle,
  exerciseDescription: initialExerciseDescription,
  passingGrade: initialPassingGrade,
  isTimed: initialIsTimed,
  initialProblems,
}) => {
  const router = useRouter();
  const { toast } = useToast();
  const [showDeleteSetConfirm, setShowDeleteSetConfirm] = useState(false);

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    exerciseSet: { id: exerciseId, title: initialExerciseTitle },
  });

  // Exercise metadata (editable)
  const [metaTitle, setMetaTitle] = useState(initialExerciseTitle);
  const [metaDescription, setMetaDescription] = useState(initialExerciseDescription);
  const [metaPassingGrade, setMetaPassingGrade] = useState(initialPassingGrade);
  const [metaIsTimed, setMetaIsTimed] = useState(initialIsTimed);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [metaExpanded, setMetaExpanded] = useState(false);

  const handleSaveMeta = async () => {
    setIsSavingMeta(true);
    const res = await updateExerciseSetAction(exerciseId, {
      title: metaTitle,
      description: metaDescription,
      passing_grade: metaPassingGrade,
      is_timed: metaIsTimed,
    });
    setIsSavingMeta(false);
    if (res.error) toast('Save Failed', res.error, 'error');
    else toast('Saved', 'Exercise settings updated.', 'success');
  };

  const handleDeleteEntireExerciseSet = async () => {
    setIsPending(true);
    const res = await deleteExerciseSetAction(exerciseId);
    setIsPending(false);
    setShowDeleteSetConfirm(false);

    if (res.error) {
      toast('Delete Failed', res.error, 'error');
    } else {
      toast('Exercise Set Deleted', 'Soft-deleted exercise set and all questions.', 'info');
      router.push(`/projects/${slug}/outlines/${outlineId}/exercise`);
    }
  };

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
  const [showSolutionInEditor, setShowSolutionInEditor] = useState(false);
  const [problemToDeleteId, setProblemToDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setStatement('');
    setSolution('');
    setShowSolutionInEditor(false);
    setProblemType('multiple_choice');
    setOptionsList(['', '', '', '']);
    setCorrectOptionIndices([0]);
    setDifficulty(2);
    setError('');
  };

  const handleOpenNew = () => {
    resetForm();
    setIsFormOpen(true);
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

  const handleGenerateProblemAI = async (parsedProblems: any[]) => {
    setIsPending(true);
    const res = await importProblemSetListAction(outlineId, parsedProblems, exerciseId, 'exercise');
    setIsPending(false);

    if (res.error) {
      toast('Generation Failed', res.error, 'error');
    } else {
      toast(
        'Problems Generated!',
        `Added ${res.count} AI-digitized exercise problems to this set.`,
        'success'
      );
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
        toast('Problem Updated', 'Saved question rep changes successfully.', 'success');
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
        correctOptionIndices,
        exerciseId,
        'exercise'
      );
      setIsPending(false);

      if (res.error) {
        setError(res.error);
        toast('Creation Error', res.error, 'error');
      } else {
        toast('Problem Added', 'Added question rep to exercise set.', 'success');
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
      toast('Problem Deleted', 'Soft-deleted question rep from exercise set.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Breadcrumb & Actions */}
      <Breadcrumb items={breadcrumbs} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${slug}/outlines/${outlineId}/exercise`}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>{metaTitle} ({initialProblems.length} Problems)</span>
            </h1>
          </div>
        </div>

        {/* Actions: Edit Settings & Delete Exercise Set */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMetaExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{metaExpanded ? 'Close Settings' : 'Edit Settings'}</span>
            {metaExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteSetConfirm(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60"
            title="Soft Delete Exercise Set"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Exercise</span>
          </button>
        </div>
      </div>

      {/* Collapsible Meta Editor */}
      {metaExpanded && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-5 animate-in fade-in duration-200">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" /> Exercise Settings
          </div>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Exercise Title</label>
              <input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="Exercise title…"
              />
            </div>
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Description (optional)</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Brief instructions or context…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Passing Grade */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  <Award className="w-3 h-3" /> Passing Grade: {metaPassingGrade}%
                </label>
                <input
                  type="range" min={0} max={100} step={5}
                  value={metaPassingGrade}
                  onChange={(e) => setMetaPassingGrade(Number(e.target.value))}
                  className="w-full h-2 accent-violet-600"
                />
              </div>
              {/* Timer toggle */}
              <div className="flex items-center gap-3 pt-4">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{metaIsTimed ? 'Timed' : 'Untimed'}</span>
                <button
                  type="button"
                  onClick={() => setMetaIsTimed((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-all ${ metaIsTimed ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${ metaIsTimed ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveMeta}
            disabled={isSavingMeta}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isSavingMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSavingMeta ? 'Saving…' : 'Save Settings'}</span>
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl px-6 py-4 shadow-m3-1">
        <GeminiOCRModal
          onBulkImport={handleGenerateProblemAI}
          label="Generate Problem (Gemini AI)"
        />

        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all m3-ripple"
        >
          <Plus className="w-4 h-4" />
          <span>Add A Problem</span>
        </button>
      </div>

      {/* Question Builder Drawer Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>{editingId ? 'Edit Exercise Question' : 'Add New Exercise Question'}</span>
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Problem Statement (LaTeX $...$ or $$...$$)
              </label>
              <textarea
                rows={6}
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                required
                placeholder="e.g. Find the points of intersection of $y = -x + 1$ and $y = (x + 1)^2$."
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Math Statement Preview</span>
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 min-h-[140px] text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                {statement ? (
                  <MathRenderer content={statement} />
                ) : (
                  <span className="text-slate-400 italic">Statement will render here...</span>
                )}
              </div>
            </div>
          </div>

          {/* Multiple Correct Answers Options Builder */}
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

          {/* Solution Guide (Hideable for Self-Study Anti-Spoiler) */}
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reference Solution Guide &amp; Key Steps (LaTeX)
              </label>
              <button
                type="button"
                onClick={() => setShowSolutionInEditor(!showSolutionInEditor)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
              >
                {showSolutionInEditor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showSolutionInEditor ? 'Hide Solution Key (Anti-Spoiler)' : 'Reveal Solution Key'}</span>
              </button>
            </div>

            {showSolutionInEditor ? (
              <textarea
                rows={5}
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                placeholder="e.g. Set equations equal: $-x + 1 = (x + 1)^2$. Expand: $-x + 1 = x^2 + 2x + 1 \implies x^2 + 3x = 0$."
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <div
                onClick={() => setShowSolutionInEditor(true)}
                className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <EyeOff className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Solution Key Hidden to Prevent Spoilers</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click here to reveal and edit reference solution steps.</p>
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
              <span>{editingId ? 'Save Exercise Question' : 'Add Question to Exercise'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Exercise Questions List Cards */}
      {initialProblems.length === 0 ? (
        <LottieEmptyState
          title="No Questions in this Exercise Set"
          message="Click 'Add A Problem' or 'Generate Problem (Gemini AI)' to add questions to this exercise set."
        />
      ) : (
        <div className="space-y-4">
          {initialProblems.map((prob, idx) => (
            <div
              key={prob.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-4 hover:border-indigo-300 transition-colors"
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

                <button
                  onClick={() => setProblemToDeleteId(prob.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <MathRenderer content={prob.problem_statement} />
              </div>

              {/* Full-width Edit Question Button Card Action */}
              <button
                onClick={() => handleEdit(prob)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Question #{idx + 1} &amp; Answers</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Custom Soft Delete Confirmation Modal for Single Problem */}
      <ConfirmModal
        isOpen={Boolean(problemToDeleteId)}
        title="Delete Question Rep"
        message="Are you sure you want to remove this question rep from the exercise set?"
        confirmText="Soft Delete Question"
        danger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setProblemToDeleteId(null)}
      />

      {/* Confirmation Modal for Deleting Entire Exercise Set */}
      <ConfirmModal
        isOpen={showDeleteSetConfirm}
        title="Delete Entire Exercise Set?"
        message="Are you sure you want to soft delete this entire exercise set and all its questions? This action will remove it from your subchapter workspace."
        confirmText="Soft Delete Exercise Set"
        danger={true}
        onConfirm={handleDeleteEntireExerciseSet}
        onClose={() => setShowDeleteSetConfirm(false)}
      />
    </div>
  );
};
