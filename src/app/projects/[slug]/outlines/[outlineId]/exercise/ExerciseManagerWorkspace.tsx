'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createExerciseSetAction, deleteExerciseSetAction } from '@/app/actions/exercise';
import { importProblemSetListAction } from '@/app/actions/problems';
import { GeminiOCRModal } from '../GeminiOCRModal';
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
  Layers,
  Play,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';

interface ExerciseSetItem {
  id: string;
  title: string;
  description: string;
  passing_grade: number;
  is_timed: number;
  questionCount: number;
  mcqCount: number;
  essayCount: number;
  otherCount: number;
}

interface ExerciseManagerWorkspaceProps {
  outlineId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  parentChapter?: { id: string; code: string; title: string } | null;
  initialExerciseSets: ExerciseSetItem[];
}

export const ExerciseManagerWorkspace: React.FC<ExerciseManagerWorkspaceProps> = ({
  outlineId,
  slug,
  projectTitle,
  subchapterCode,
  subchapterTitle,
  parentChapter,
  initialExerciseSets,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    childPage: 'Exercise Sets',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'choice' | 'manual' | 'ai'>('choice');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [setToDeleteId, setSetToDeleteId] = useState<string | null>(null);

  const resetModal = () => {
    setModalStep('choice');
    setTitle('');
    setDescription('');
    setIsModalOpen(false);
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsPending(true);
    const res = await createExerciseSetAction(outlineId, title.trim(), description.trim(), 70, true);
    setIsPending(false);

    if (res.error) {
      toast('Creation Failed', res.error, 'error');
    } else {
      toast('Exercise Set Created', `Opening question builder for "${title.trim()}"...`, 'success');
      resetModal();
      router.push(`/projects/${slug}/outlines/${outlineId}/exercise/${res.id}`);
    }
  };

  const handleCreateAIImport = async (parsedProblems: any[]) => {
    setIsPending(true);

    const setRes = await createExerciseSetAction(outlineId, 'Textbook Exercise Set', '', 70, true);
    if (setRes.error) {
      setIsPending(false);
      toast('Creation Failed', setRes.error, 'error');
      return;
    }

    const exerciseId = setRes.id!;
    const res = await importProblemSetListAction(outlineId, parsedProblems, exerciseId, 'exercise');
    setIsPending(false);

    if (res.error) {
      toast('Import Failed', res.error, 'error');
    } else {
      toast('Exercise Set Created', `Digitized ${res.count} questions into exercise set.`, 'success');
      resetModal();
      router.push(`/projects/${slug}/outlines/${outlineId}/exercise/${exerciseId}`);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!setToDeleteId) return;
    setIsPending(true);
    const res = await deleteExerciseSetAction(setToDeleteId);
    setIsPending(false);
    setSetToDeleteId(null);

    if (res.error) {
      toast('Delete Failed', res.error, 'error');
    } else {
      toast('Exercise Set Deleted', 'Removed exercise set and its questions.', 'info');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Add Button */}
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
              <Layers className="w-5 h-5 text-violet-600 flex-shrink-0" />
              <span>Exercise Sets Manager ({initialExerciseSets.length})</span>
            </h1>
          </div>
        </div>

        <button
          onClick={() => {
            setModalStep('choice');
            setIsModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition-all m3-ripple self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exercise Set</span>
        </button>
      </div>

      {/* Exercise Sets Grid */}
      {initialExerciseSets.length === 0 ? (
        <LottieEmptyState
          title="No Exercise Sets Created Yet"
          message="Click '+ Add Exercise Set' to create timed/graded problem sets with multiple choice and essay questions for student self-study."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {initialExerciseSets.map((exSet) => {
            const countLabel = [
              exSet.mcqCount > 0 ? `${exSet.mcqCount} MCQ` : null,
              exSet.essayCount > 0 ? `${exSet.essayCount} Essay` : null,
              exSet.otherCount > 0 ? `${exSet.otherCount} Other` : null,
            ].filter(Boolean).join(' · ') || 'No questions yet';

            return (
              <div
                key={exSet.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-m3-1 space-y-4 hover:border-violet-300 dark:hover:border-violet-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="p-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 border border-violet-200/60 flex-shrink-0">
                        <Layers className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded border border-violet-200/40">
                        EXERCISE SET
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {exSet.is_timed ? 'Timed' : 'Untimed'}
                      </span>
                    </div>

                    <button
                      onClick={() => setSetToDeleteId(exSet.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex-shrink-0"
                      title="Delete Exercise Set"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight break-words">{exSet.title}</h3>
                    {exSet.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exSet.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-center pt-1">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">{exSet.questionCount}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Questions ({countLabel})</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="text-base sm:text-lg font-black text-violet-600 dark:text-violet-400 font-mono">{exSet.passing_grade}%</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passing Grade</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/projects/${slug}/outlines/${outlineId}/exercise/${exSet.id}`}
                    className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Manage Questions</span>
                  </Link>

                  <Link
                    href={`/projects/${slug}/outlines/${outlineId}/exercise/${exSet.id}/lobby`}
                    className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm shadow-violet-600/30 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Preview Lobby</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Exercise Set</h3>
              </div>
              <button onClick={resetModal} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalStep === 'choice' && (
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setModalStep('manual')}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-violet-500 text-left space-y-1 transition-all group"
                >
                  <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white">
                    <span>Add Manually</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Set a title and build exercise questions manually on a dedicated page.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setModalStep('ai')}
                  className="p-5 rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/30 hover:border-violet-500 text-left space-y-1 transition-all group"
                >
                  <div className="flex items-center justify-between font-bold text-xs text-violet-900 dark:text-violet-200">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <span>AI Generated (Textbook Photo OCR)</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-violet-400 group-hover:text-violet-600" />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Upload textbook page photo and let Gemini AI parse the exercise questions.
                  </p>
                </button>
              </div>
            )}

            {modalStep === 'manual' && (
              <form onSubmit={handleCreateManual} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Exercise Set Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Problem Set 0.4: Graphing Equations"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Brief instructions or context for students…"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalStep('choice')}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || !title.trim()}
                    className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 flex items-center gap-2 disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isPending ? 'Creating…' : 'Open Dedicated Builder'}</span>
                  </button>
                </div>
              </form>
            )}

            {modalStep === 'ai' && (
              <div className="space-y-4">
                <GeminiOCRModal
                  onBulkImport={handleCreateAIImport}
                  label="Upload Exercise Page Photo"
                />
                <button
                  type="button"
                  onClick={() => setModalStep('choice')}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:underline"
                >
                  Cancel &amp; Back
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Set Confirm */}
      {setToDeleteId && (
        <ConfirmModal
          isOpen={Boolean(setToDeleteId)}
          title="Delete Exercise Set?"
          message="Are you sure you want to delete this exercise set and all its questions?"
          onConfirm={handleDeleteConfirm}
          onClose={() => setSetToDeleteId(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
};
