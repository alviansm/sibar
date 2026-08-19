'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  createProblemAction,
  updateProblemAction,
  deleteProblemAction,
  importProblemSetListAction,
} from '@/app/actions/problems';
import { MathRenderer } from '@/components/MathRenderer';
import { RichContentToolbar, handleClipboardImagePaste } from '@/components/RichContentToolbar';
import { DriveAttachmentUploader } from '@/components/DriveAttachmentUploader';
import { GeminiOCRModal } from '../GeminiOCRModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { SubchapterStudyTimer } from '@/components/SubchapterStudyTimer';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  Lightbulb,
  CheckCircle2,
  Loader2,
  Sparkles,
  CheckSquare,
  Square,
  HelpCircle,
} from 'lucide-react';

interface ExampleManagerWorkspaceProps {
  outlineId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  parentChapter?: { id: string; code: string; title: string } | null;
  initialExamples: any[];
}

export const ExampleManagerWorkspace: React.FC<ExampleManagerWorkspaceProps> = ({
  outlineId,
  slug,
  projectTitle,
  subchapterCode,
  subchapterTitle,
  parentChapter,
  initialExamples,
}) => {
  const { toast } = useToast();

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    childPage: 'Example Problems',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [statement, setStatement] = useState('');
  const [solution, setSolution] = useState('');
  const [problemType, setProblemType] = useState<
    'derivation' | 'calculation' | 'multiple_choice' | 'essay'
  >('multiple_choice');

  const [optionsList, setOptionsList] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>([0]);
  const [difficulty, setDifficulty] = useState(2);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');
  const [problemToDeleteId, setProblemToDeleteId] = useState<string | null>(null);

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
        if (Array.isArray(arr) && arr.length > 0) setOptionsList(arr);
        else setOptionsList(['', '', '', '']);
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

  const handleBulkOCRImport = async (parsedProblems: any[]) => {
    setIsPending(true);
    const res = await importProblemSetListAction(outlineId, parsedProblems, null, 'example');
    setIsPending(false);

    if (res.error) {
      toast('Import Failed', res.error, 'error');
    } else {
      toast(
        'Examples Digitized!',
        `Created ${res.count} example problems.`,
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
        toast('Example Updated', 'Saved changes successfully.', 'success');
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
        null,
        'example'
      );
      setIsPending(false);

      if (res.error) {
        setError(res.error);
        toast('Creation Error', res.error, 'error');
      } else {
        toast('Example Added', 'Created standalone example problem.', 'success');
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
      toast('Example Deleted', 'Removed example problem.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      <SubchapterStudyTimer
        category="problem"
        activityName="Worked Example Study & Practice"
        subchapterName={`${subchapterCode} ${subchapterTitle}`}
        projectName={projectTitle}
        outlineId={outlineId}
        position="floating"
      />

      {/* Top Header Breadcrumb & Actions */}
      <Breadcrumb items={breadcrumbs} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-m3-1">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${slug}?sub=${outlineId}`}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <span>Example Problem Builder ({initialExamples.length})</span>
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <GeminiOCRModal
            onBulkImport={handleBulkOCRImport}
            label="Generate Example Problem (Gemini AI)"
          />

          <button
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold shadow-md shadow-amber-500/30 flex items-center gap-2 transition-all m3-ripple"
          >
            <Plus className="w-4 h-4" />
            <span>Add Example Problem</span>
          </button>
        </div>
      </div>

      {/* Form Drawer */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <span>{editingId ? 'Edit Example Problem' : 'Add New Example Problem'}</span>
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
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Format Type
              </label>
              <select
                value={problemType}
                onChange={(e: any) => setProblemType(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="multiple_choice">Multiple Choice Quiz</option>
                <option value="calculation">Numerical Calculation</option>
                <option value="derivation">Proof / Derivation</option>
                <option value="essay">Essay / Free Response</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Difficulty Level (1-5)
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

          {/* Problem Statement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Problem Statement (LaTeX, Plots, Diagrams & Images supported)
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
              required
              rows={4}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              onPaste={(e) =>
                handleClipboardImagePaste(
                  e,
                  (snippet) => setStatement((prev) => prev + snippet),
                  toast
                )
              }
              placeholder="e.g. Find the roots of $f(x) = 2x^2 - 8$ or embed graph/plot."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
            />
            {statement.trim() && (
              <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 text-xs max-h-96 overflow-y-auto">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Live Rich Content Preview</div>
                <MathRenderer content={statement} />
              </div>
            )}
          </div>

          {/* Multiple Choice Options */}
          {problemType === 'multiple_choice' && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Multiple Choice Options &amp; Correct Keys
                </label>
                <button
                  type="button"
                  onClick={handleAddOptionChoice}
                  className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Choice
                </button>
              </div>

              <div className="space-y-3">
                {optionsList.map((opt, oIdx) => {
                  const isKey = correctOptionIndices.includes(oIdx);
                  return (
                    <div key={oIdx} className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => toggleCorrectIndex(oIdx)}
                        className={`p-2 rounded-xl border transition-all flex-shrink-0 ${
                          isKey
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                        title={isKey ? 'Marked as correct key' : 'Click to mark as correct key'}
                      >
                        {isKey ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>

                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(oIdx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        className="flex-1 px-3 sm:px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono min-w-0"
                      />

                      {optionsList.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionChoice(oIdx)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reference Solution */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reference Solution Guide (LaTeX, Plots & Diagrams supported)
              </label>
            </div>
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
              required
              rows={4}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              onPaste={(e) =>
                handleClipboardImagePaste(
                  e,
                  (snippet) => setSolution((prev) => prev + snippet),
                  toast
                )
              }
              placeholder="Step-by-step worked solution..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white"
            />
            {solution.trim() && (
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs max-h-96 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Live Solution Preview</div>
                <MathRenderer content={solution} />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setProblemToDeleteId(editingId);
                    setIsFormOpen(false);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Example</span>
                </button>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-md shadow-amber-500/30 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{editingId ? 'Save Changes' : 'Create Example'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List of Existing Example Problems */}
      {initialExamples.length === 0 ? (
        <LottieEmptyState
          title="No Example Problems Yet"
          message="Create standalone worked example problems to help students solidify concepts before tackling exercises."
        />
      ) : (
        <div className="space-y-4">
          {initialExamples.map((prob, idx) => (
            <div
              key={prob.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-m3-1 space-y-4"
            >
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200/60 flex-shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                    Example #{idx + 1}
                  </span>
                  <span className="text-xs font-bold uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {prob.problem_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-amber-500 font-bold font-mono">
                    Diff {prob.difficulty}/5
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(prob)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                    title="Edit Example"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setProblemToDeleteId(prob.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Example"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 overflow-x-auto">
                <MathRenderer content={prob.problem_statement} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {problemToDeleteId && (
        <ConfirmModal
          isOpen={Boolean(problemToDeleteId)}
          title="Delete Example Problem?"
          message="Are you sure you want to remove this example problem?"
          onConfirm={handleDeleteConfirm}
          onClose={() => setProblemToDeleteId(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
};
