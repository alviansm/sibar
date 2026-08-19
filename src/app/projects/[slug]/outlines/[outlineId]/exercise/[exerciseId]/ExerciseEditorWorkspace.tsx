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
import { RichContentToolbar, handleClipboardImagePaste } from '@/components/RichContentToolbar';
import { DriveAttachmentUploader } from '@/components/DriveAttachmentUploader';
import { GeminiOCRModal } from '../../GeminiOCRModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { AVAILABLE_GEMINI_MODELS } from '@/lib/gemini';
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
  LineChart,
  Wand2,
  RotateCcw,
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
  const [showOptionsInEditor, setShowOptionsInEditor] = useState(true);
  const [problemToDeleteId, setProblemToDeleteId] = useState<string | null>(null);

  // AI-Assisted Adjustment state
  const [isAiAssistOpen, setIsAiAssistOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiModel, setAiModel] = useState('gemini-3.6-flash');
  const [isAiAdjusting, setIsAiAdjusting] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setStatement('');
    setSolution('');
    setShowSolutionInEditor(false);
    setShowOptionsInEditor(true);
    setIsAiAssistOpen(false);
    setAiInstruction('');
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
    if (editingId === prob.id && isFormOpen) {
      resetForm();
      setIsFormOpen(false);
      return;
    }

    setEditingId(prob.id);
    setStatement(prob.problem_statement);
    setSolution(prob.solution_guide);
    setProblemType(prob.problem_type);
    setDifficulty(prob.difficulty || 2);
    setIsAiAssistOpen(false);
    setAiInstruction('');

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

  const handleApplyAiAdjustment = async (instructionOverride?: string) => {
    const textToApply = (instructionOverride || aiInstruction).trim();
    if (!textToApply) {
      toast('Prompt Required', 'Please provide instructions for the AI adjustment.', 'warning');
      return;
    }

    setIsAiAdjusting(true);
    try {
      const res = await fetch('/api/ai/adjust-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentProblem: {
            problem_statement: statement,
            solution_guide: solution,
            problem_type: problemType,
            options: optionsList.filter((o) => o.trim().length > 0),
            correct_option_indices: correctOptionIndices,
            difficulty,
          },
          instruction: textToApply,
          modelName: aiModel,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast('AI Adjustment Failed', data.error || 'Could not adjust problem', 'error');
      } else {
        if (data.problem_statement) setStatement(data.problem_statement);
        if (data.solution_guide) setSolution(data.solution_guide);
        if (data.problem_type) setProblemType(data.problem_type);
        if (typeof data.difficulty === 'number') setDifficulty(data.difficulty);
        if (Array.isArray(data.options) && data.options.length > 0) {
          setOptionsList(data.options);
        }
        if (Array.isArray(data.correct_option_indices) && data.correct_option_indices.length > 0) {
          setCorrectOptionIndices(data.correct_option_indices);
        }
        toast('AI Adjustments Applied', data.ai_summary || 'Updated question, graph, and solutions!', 'success');
        setAiInstruction('');
      }
    } catch (err: any) {
      toast('AI Error', err?.message || 'Failed to adjust problem with AI', 'error');
    } finally {
      setIsAiAdjusting(false);
    }
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

      {/* Question Builder Drawer Form for NEW questions */}
      {isFormOpen && editingId === null && (
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Add New Exercise Question</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAiAssistOpen(!isAiAssistOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isAiAssistOpen
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>AI Assist &amp; Polish</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* AI Assistant Bar */}
          {isAiAssistOpen && (
            <div className="bg-gradient-to-br from-indigo-50/70 via-sky-50/50 to-purple-50/60 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100/80 dark:border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>AI-Assisted Question Adjuster</span>
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
                        Gemini Vision &amp; Math
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">Ask Gemini to re-calculate keys, add Cartesian plots, generate step guides, or alter numbers.</p>
                  </div>
                </div>

                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-xs"
                >
                  {AVAILABLE_GEMINI_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preset quick actions */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mr-1">
                  Quick Actions:
                </span>
                <button
                  type="button"
                  disabled={isAiAdjusting}
                  onClick={() => handleApplyAiAdjustment("Add a 2D Cartesian function plot (```plot) for this equation to the problem statement and update the question to reference it.")}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  <LineChart className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Add Cartesian Plot</span>
                </button>
                <button
                  type="button"
                  disabled={isAiAdjusting}
                  onClick={() => handleApplyAiAdjustment("Alter the numbers in this problem to create a new variant, and rigorously recalculate the step-by-step solution and answer keys.")}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Vary Numbers &amp; Recalculate</span>
                </button>
                <button
                  type="button"
                  disabled={isAiAdjusting}
                  onClick={() => handleApplyAiAdjustment("Expand and improve the step-by-step LaTeX solution guide with clear pedagogical reasoning and derivations.")}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Enhance Solution Steps</span>
                </button>
                <button
                  type="button"
                  disabled={isAiAdjusting}
                  onClick={() => handleApplyAiAdjustment("Improve the multiple choice distractors with common student misconception options and ensure the correct answer key is exact.")}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  <span>Refine MCQ Distractors</span>
                </button>
              </div>

              {/* Custom prompt input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  disabled={isAiAdjusting}
                  placeholder='e.g. "Change radius to 5 and recalculate", "Add a Mermaid state diagram", "Increase difficulty level to 4"...'
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyAiAdjustment();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={isAiAdjusting || !aiInstruction.trim()}
                  onClick={() => handleApplyAiAdjustment()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isAiAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  <span>{isAiAdjusting ? 'Adjusting with AI...' : 'Apply Adjustment'}</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Statement & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Problem Statement (LaTeX, Plots, Diagrams &amp; Images)
                  </label>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <RichContentToolbar
                    onInsert={(snippet) => setStatement((prev) => prev + snippet)}
                  />
                  <DriveAttachmentUploader
                    entityType="problem"
                    entityId={editingId || outlineId}
                    projectSlug={slug}
                    buttonLabel="Drive Attach"
                    onUploadSuccess={(att) => {
                      if (att.mime_type.startsWith('image/')) {
                        setStatement((prev) => prev + `\n![${att.file_name}](${att.web_view_link})\n`);
                      } else {
                        setStatement((prev) => prev + `\n[📄 ${att.file_name}](${att.web_view_link})\n`);
                      }
                    }}
                  />
                </div>
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
                  placeholder="e.g. Find the center, radius, and y-intercepts of the circle defined by the equation..."
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

            {/* Multiple Choice Options (With Anti-Spoiler Toggle & Image Paste) */}
            {problemType === 'multiple_choice' && (
              <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Multiple Choice Options ({optionsList.length} Choices)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Provide each option in its own input field. Supports LaTeX ($...$) and image paste.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOptionsInEditor(!showOptionsInEditor)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                  >
                    {showOptionsInEditor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showOptionsInEditor ? 'Hide Answer Keys (Anti-Spoiler)' : 'Reveal Answer Keys'}</span>
                  </button>
                </div>

                {showOptionsInEditor ? (
                  <div className="space-y-3">
                    {optionsList.map((optVal, optIdx) => {
                      const isCorrect = correctOptionIndices.includes(optIdx);
                      const labelLetter = String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={optIdx}
                          className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono border border-slate-200 dark:border-slate-700">
                              {labelLetter}
                            </span>

                            <input
                              type="text"
                              value={optVal}
                              onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                              onPaste={(e) =>
                                handleClipboardImagePaste(
                                  e,
                                  (snippet) => handleOptionChange(optIdx, optVal + snippet),
                                  toast
                                )
                              }
                              placeholder={`Option ${labelLetter} text, LaTeX ($...$), or image markdown`}
                              className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />

                            <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => toggleCorrectIndex(optIdx)}
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
                                onClick={() => handleRemoveOptionChoice(optIdx)}
                                disabled={optionsList.length <= 2}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Remove option choice"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Live preview for option if it contains rich content or LaTeX or images */}
                          {optVal.trim() && (optVal.includes('$') || optVal.includes('![') || optVal.includes('```')) && (
                            <div className="pl-11 pr-2 py-1 text-xs text-slate-700 dark:text-slate-300">
                              <MathRenderer content={optVal} />
                            </div>
                          )}
                        </div>
                      );
                    })}

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
                ) : (
                  <div
                    onClick={() => setShowOptionsInEditor(true)}
                    className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <EyeOff className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Answer Keys Hidden to Prevent Spoilers</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click here to reveal and edit choice options and correct answer keys.</p>
                  </div>
                )}
              </div>
            )}

            {/* Solution Guide */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Reference Solution Guide &amp; Key Steps (LaTeX, Plots &amp; Diagrams)
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
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <RichContentToolbar
                      onInsert={(snippet) => setSolution((prev) => prev + snippet)}
                    />
                    <DriveAttachmentUploader
                      entityType="problem"
                      entityId={editingId || outlineId}
                      projectSlug={slug}
                      buttonLabel="Drive Attach"
                      onUploadSuccess={(att) => {
                        if (att.mime_type.startsWith('image/')) {
                          setSolution((prev) => prev + `\n![${att.file_name}](${att.web_view_link})\n`);
                        } else {
                          setSolution((prev) => prev + `\n[📄 ${att.file_name}](${att.web_view_link})\n`);
                        }
                      }}
                    />
                  </div>
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
                    placeholder="e.g. Set equations equal: $-x + 1 = (x + 1)^2$..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  {solution.trim() && (
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs max-h-96 overflow-y-auto">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Live Solution Preview</div>
                      <MathRenderer content={solution} />
                    </div>
                  )}
                </div>
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
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
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
                <span>Add Question to Exercise</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exercise Questions List Cards (With Inline Accordion Editing) */}
      {initialProblems.length === 0 ? (
        <LottieEmptyState
          title="No Questions in this Exercise Set"
          message="Click 'Add A Problem' or 'Generate Problem (Gemini AI)' to add questions to this exercise set."
        />
      ) : (
        <div className="space-y-4">
          {initialProblems.map((prob, idx) => {
            const isBeingEdited = isFormOpen && editingId === prob.id;

            if (isBeingEdited) {
              return (
                <div
                  key={prob.id}
                  className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 ring-4 ring-indigo-500/10 transition-all animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center font-mono shadow-sm shadow-indigo-600/30">
                        #{idx + 1}
                      </span>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Editing Question #{idx + 1} &amp; Answers</span>
                        </h3>
                        <p className="text-[11px] text-slate-400">Edit fields directly on the spot or use AI to refine</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAiAssistOpen(!isAiAssistOpen)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isAiAssistOpen
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                        }`}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>AI Assist &amp; Polish</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          resetForm();
                          setIsFormOpen(false);
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Collapse editor"
                      >
                        <ChevronUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Collapse</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Assistant Bar */}
                  {isAiAssistOpen && (
                    <div className="bg-gradient-to-br from-indigo-50/70 via-sky-50/50 to-purple-50/60 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100/80 dark:border-indigo-900/40">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>AI-Assisted Question Adjuster</span>
                              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono">
                                Gemini Vision &amp; Math
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-500">Ask Gemini to re-calculate keys, add Cartesian plots, generate step guides, or alter numbers.</p>
                          </div>
                        </div>

                        <select
                          value={aiModel}
                          onChange={(e) => setAiModel(e.target.value)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[11px] font-semibold text-slate-800 dark:text-slate-200 shadow-xs"
                        >
                          {AVAILABLE_GEMINI_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Preset quick actions */}
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mr-1">
                          Quick Actions:
                        </span>
                        <button
                          type="button"
                          disabled={isAiAdjusting}
                          onClick={() => handleApplyAiAdjustment("Add a 2D Cartesian function plot (```plot) for this equation to the problem statement and update the question to reference it.")}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                        >
                          <LineChart className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Add Cartesian Plot</span>
                        </button>
                        <button
                          type="button"
                          disabled={isAiAdjusting}
                          onClick={() => handleApplyAiAdjustment("Alter the numbers in this problem to create a new variant, and rigorously recalculate the step-by-step solution and answer keys.")}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Vary Numbers &amp; Recalculate</span>
                        </button>
                        <button
                          type="button"
                          disabled={isAiAdjusting}
                          onClick={() => handleApplyAiAdjustment("Expand and improve the step-by-step LaTeX solution guide with clear pedagogical reasoning and derivations.")}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                          <span>Enhance Solution Steps</span>
                        </button>
                        <button
                          type="button"
                          disabled={isAiAdjusting}
                          onClick={() => handleApplyAiAdjustment("Improve the multiple choice distractors with common student misconception options and ensure the correct answer key is exact.")}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/80 rounded-xl text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                        >
                          <Layers className="w-3.5 h-3.5 text-purple-500" />
                          <span>Refine MCQ Distractors</span>
                        </button>
                      </div>

                      {/* Custom prompt input */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={aiInstruction}
                          onChange={(e) => setAiInstruction(e.target.value)}
                          disabled={isAiAdjusting}
                          placeholder='e.g. "Change radius to 5 and recalculate", "Add a Mermaid state diagram", "Increase difficulty level to 4"...'
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleApplyAiAdjustment();
                            }
                          }}
                        />
                        <button
                          type="button"
                          disabled={isAiAdjusting || !aiInstruction.trim()}
                          onClick={() => handleApplyAiAdjustment()}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                          {isAiAdjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          <span>{isAiAdjusting ? 'Adjusting with AI...' : 'Apply Adjustment'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
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

                    {/* Statement & Live Preview */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Problem Statement (LaTeX, Plots, Diagrams &amp; Images)
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

                    {/* Multiple Choice Options (With Anti-Spoiler Toggle & Image Paste) */}
                    {problemType === 'multiple_choice' && (
                      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                              Multiple Choice Options ({optionsList.length} Choices)
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Provide each option in its own input field. Supports LaTeX ($...$) and image paste.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowOptionsInEditor(!showOptionsInEditor)}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                          >
                            {showOptionsInEditor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            <span>{showOptionsInEditor ? 'Hide Answer Keys (Anti-Spoiler)' : 'Reveal Answer Keys'}</span>
                          </button>
                        </div>

                        {showOptionsInEditor ? (
                          <div className="space-y-3">
                            {optionsList.map((optVal, optIdx) => {
                              const isCorrect = correctOptionIndices.includes(optIdx);
                              const labelLetter = String.fromCharCode(65 + optIdx);

                              return (
                                <div
                                  key={optIdx}
                                  className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${
                                    isCorrect
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center flex-shrink-0 font-mono border border-slate-200 dark:border-slate-700">
                                      {labelLetter}
                                    </span>

                                    <input
                                      type="text"
                                      value={optVal}
                                      onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                                      onPaste={(e) =>
                                        handleClipboardImagePaste(
                                          e,
                                          (snippet) => handleOptionChange(optIdx, optVal + snippet),
                                          toast
                                        )
                                      }
                                      placeholder={`Option ${labelLetter} text, LaTeX ($...$), or image markdown`}
                                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />

                                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                                      <button
                                        type="button"
                                        onClick={() => toggleCorrectIndex(optIdx)}
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
                                        onClick={() => handleRemoveOptionChoice(optIdx)}
                                        disabled={optionsList.length <= 2}
                                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Remove option choice"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Live preview for option if it contains rich content or LaTeX or images */}
                                  {optVal.trim() && (optVal.includes('$') || optVal.includes('![') || optVal.includes('```')) && (
                                    <div className="pl-11 pr-2 py-1 text-xs text-slate-700 dark:text-slate-300">
                                      <MathRenderer content={optVal} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}

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
                        ) : (
                          <div
                            onClick={() => setShowOptionsInEditor(true)}
                            className="p-4 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <EyeOff className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">Answer Keys Hidden to Prevent Spoilers</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Click here to reveal and edit choice options and correct answer keys.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Solution Guide */}
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Reference Solution Guide &amp; Key Steps (LaTeX, Plots &amp; Diagrams)
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
                        <div className="space-y-2">
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
                            placeholder="e.g. Set equations equal: $-x + 1 = (x + 1)^2$..."
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                          />
                          {solution.trim() && (
                            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs max-h-96 overflow-y-auto">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Live Solution Preview</div>
                              <MathRenderer content={solution} />
                            </div>
                          )}
                        </div>
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

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <button
                          type="button"
                          onClick={() => setProblemToDeleteId(prob.id)}
                          className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Question</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFormOpen(false);
                            resetForm();
                          }}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 transition-all"
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>Save Changes (Question #{idx + 1})</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              );
            }

            return (
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
            );
          })}
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
