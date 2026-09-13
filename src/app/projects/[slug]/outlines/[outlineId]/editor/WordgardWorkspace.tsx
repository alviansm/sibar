'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WordgardDocumentEditor, WordgardDocumentEditorRef } from '@/components/WordgardDocumentEditor';
import { saveSingleConceptAction } from '@/app/actions/projects';
import { createProblemAction, updateProblemAction } from '@/app/actions/problems';
import { useToast } from '@/components/Toast';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  HelpCircle,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';

export interface ConceptEditData {
  id: string;
  title: string;
  content: string;
}

export interface ProblemEditData {
  id: string;
  statement: string;
  solution: string;
  problemType: 'derivation' | 'calculation' | 'multiple_choice' | 'essay';
  options: string[];
  correctOptionIndices: number[];
  difficulty: number;
}

interface WordgardWorkspaceProps {
  outlineId: string;
  slug: string;
  projectTitle: string;
  subchapterCode: string;
  subchapterTitle: string;
  parentChapter?: { id: string; code: string; title: string } | null;
  type: 'concept' | 'example' | 'problem';
  id: string;
  exerciseId?: string;
  initialConcept?: ConceptEditData;
  initialProblem?: ProblemEditData;
  returnUrl: string;
}

export const WordgardWorkspace: React.FC<WordgardWorkspaceProps> = ({
  outlineId,
  slug,
  projectTitle,
  subchapterCode,
  subchapterTitle,
  parentChapter,
  type,
  id,
  exerciseId,
  initialConcept,
  initialProblem,
  returnUrl,
}) => {
  const router = useRouter();
  const { toast } = useToast();

  // Concept state
  const [conceptTitle, setConceptTitle] = useState(initialConcept?.title || 'Untitled Concept Note');
  const [conceptContent, setConceptContent] = useState(initialConcept?.content || '');

  // Problem state (for example or exercise)
  const [activeProblemTab, setActiveProblemTab] = useState<'statement' | 'solution'>('statement');
  const [problemStatement, setProblemStatement] = useState(initialProblem?.statement || '');
  const [problemSolution, setProblemSolution] = useState(initialProblem?.solution || '');
  const [problemType, setProblemType] = useState(initialProblem?.problemType || 'multiple_choice');
  const [optionsList, setOptionsList] = useState<string[]>(initialProblem?.options || ['', '', '', '']);
  const [correctOptionIndices, setCorrectOptionIndices] = useState<number[]>(
    initialProblem?.correctOptionIndices || [0]
  );
  const [difficulty, setDifficulty] = useState<number>(initialProblem?.difficulty || 2);

  // Status state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(new Date());

  const editorRef = useRef<WordgardDocumentEditorRef>(null);

  const breadcrumbs = buildBreadcrumbs({
    project: { name: projectTitle, slug },
    chapter: parentChapter,
    subchapter: { id: outlineId, code: subchapterCode, title: subchapterTitle },
    childPage: type === 'concept' ? 'Document Editor: Concept' : type === 'example' ? 'Document Editor: Worked Example' : 'Document Editor: Exercise Problem',
  });

  const handleSave = async (returnAfterSave = false) => {
    setIsSaving(true);

    try {
      // Pull latest HTML from editor if active
      let latestEditorHtml = '';
      if (editorRef.current) {
        latestEditorHtml = editorRef.current.getHtml();
      }

      if (type === 'concept') {
        const finalContent = latestEditorHtml || conceptContent;
        const res = await saveSingleConceptAction(outlineId, {
          id: id === 'new' ? crypto.randomUUID() : id,
          title: conceptTitle.trim() || 'Untitled Concept',
          content: finalContent,
        });

        if (res.error) {
          toast('Save Error', res.error, 'error');
        } else {
          setHasUnsavedChanges(false);
          setLastSavedTime(new Date());
          toast('Concept Saved', `"${conceptTitle}" saved successfully.`, 'success');
          if (returnAfterSave) {
            router.push(returnUrl);
          }
        }
      } else {
        // Example or Exercise problem
        const finalStatement = activeProblemTab === 'statement' ? (latestEditorHtml || problemStatement) : problemStatement;
        const finalSolution = activeProblemTab === 'solution' ? (latestEditorHtml || problemSolution) : problemSolution;

        const validOptions =
          problemType === 'multiple_choice'
            ? optionsList.map((o) => o.trim()).filter((o) => o.length > 0)
            : null;

        const firstIndex = correctOptionIndices[0] ?? 0;

        if (id && id !== 'new') {
          const res = await updateProblemAction(
            id,
            finalStatement,
            finalSolution,
            problemType as any,
            validOptions,
            firstIndex,
            difficulty,
            correctOptionIndices
          );

          if (res.error) {
            toast('Save Error', res.error, 'error');
          } else {
            setHasUnsavedChanges(false);
            setLastSavedTime(new Date());
            toast('Problem Saved', 'Problem updated successfully.', 'success');
            if (returnAfterSave) {
              router.push(returnUrl);
            }
          }
        } else {
          const res = await createProblemAction(
            outlineId,
            finalStatement,
            finalSolution,
            problemType as any,
            validOptions,
            firstIndex,
            difficulty,
            correctOptionIndices,
            exerciseId,
            type === 'example' ? 'example' : 'exercise'
          );

          if (res.error) {
            toast('Save Error', res.error, 'error');
          } else {
            setHasUnsavedChanges(false);
            setLastSavedTime(new Date());
            toast('Problem Created', 'New problem card saved.', 'success');
            if (returnAfterSave) {
              router.push(returnUrl);
            }
          }
        }
      }
    } catch (err: any) {
      toast('Save Failed', err?.message || 'Could not save document', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOption = () => {
    setOptionsList([...optionsList, '']);
    setHasUnsavedChanges(true);
  };

  const handleRemoveOption = (index: number) => {
    setOptionsList(optionsList.filter((_, i) => i !== index));
    setCorrectOptionIndices(correctOptionIndices.filter((i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const toggleCorrectIndex = (idx: number) => {
    if (correctOptionIndices.includes(idx)) {
      if (correctOptionIndices.length > 1) {
        setCorrectOptionIndices(correctOptionIndices.filter((i) => i !== idx));
      }
    } else {
      setCorrectOptionIndices([...correctOptionIndices, idx]);
    }
    setHasUnsavedChanges(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Sticky Top Document Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Breadcrumbs & Back Navigation */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={returnUrl}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors flex-shrink-0"
              title="Return to Subchapter Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono truncate">
                <span>{subchapterCode}</span>
                <span>/</span>
                <span className="truncate max-w-[200px]">{subchapterTitle}</span>
                <span>/</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Wordgard</span>
              </div>

              {/* Editable Title Header */}
              {type === 'concept' ? (
                <input
                  type="text"
                  value={conceptTitle}
                  onChange={(e) => {
                    setConceptTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter Concept Title (e.g. Order Properties of Real Numbers)"
                  className="w-full text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors truncate mt-0.5"
                />
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {type === 'example' ? 'Worked Example Problem' : 'Exercise Set Problem'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
                    Difficulty {difficulty}/5
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Save Status & Actions */}
          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {/* Status indicator */}
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mr-1 hidden sm:flex">
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>Saving...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Unsaved edits</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Saved</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
              title="Save current progress"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50"
              title="Save and return to previous workspace"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save &amp; Return</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Document Workspace */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        {/* For Problem / Example: Section Switcher & Multiple Choice Options */}
        {type !== 'concept' && (
          <div className="w-full max-w-4xl mb-6 space-y-4">
            {/* Section Switcher (Statement vs. Solution Guide) */}
            <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    if (editorRef.current && activeProblemTab === 'statement') {
                      setProblemStatement(editorRef.current.getHtml());
                    } else if (editorRef.current && activeProblemTab === 'solution') {
                      setProblemSolution(editorRef.current.getHtml());
                    }
                    setActiveProblemTab('statement');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    activeProblemTab === 'statement'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Problem Statement</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (editorRef.current && activeProblemTab === 'statement') {
                      setProblemStatement(editorRef.current.getHtml());
                    } else if (editorRef.current && activeProblemTab === 'solution') {
                      setProblemSolution(editorRef.current.getHtml());
                    }
                    setActiveProblemTab('solution');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    activeProblemTab === 'solution'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Reference Solution Guide</span>
                </button>
              </div>

              {/* Problem Metadata Settings */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <span>Type:</span>
                  <select
                    value={problemType}
                    onChange={(e) => {
                      setProblemType(e.target.value as any);
                      setHasUnsavedChanges(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="calculation">Calculation</option>
                    <option value="derivation">Derivation</option>
                    <option value="essay">Essay / Freeform</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <span>Difficulty:</span>
                  <select
                    value={difficulty}
                    onChange={(e) => {
                      setDifficulty(Number(e.target.value));
                      setHasUnsavedChanges(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={1}>1 - Beginner</option>
                    <option value={2}>2 - Elementary</option>
                    <option value={3}>3 - Intermediate</option>
                    <option value={4}>4 - Advanced</option>
                    <option value={5}>5 - Mastery</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Multiple Choice Options Builder */}
            {problemType === 'multiple_choice' && activeProblemTab === 'statement' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Multiple Choice Answer Keys</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Option</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {optionsList.map((opt, oIdx) => {
                    const isKey = correctOptionIndices.includes(oIdx);
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
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
                          onChange={(e) => {
                            const updated = [...optionsList];
                            updated[oIdx] = e.target.value;
                            setOptionsList(updated);
                            setHasUnsavedChanges(true);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)} (LaTeX supported e.g. $x = \\pm 2$)`}
                          className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono min-w-0"
                        />

                        {optionsList.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(oIdx)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
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
          </div>
        )}

        {/* Wordgard Full-Page Document Canvas */}
        {type === 'concept' ? (
          <WordgardDocumentEditor
            key="concept-editor"
            ref={editorRef}
            initialContent={conceptContent}
            onChange={(html) => {
              setConceptContent(html);
              setHasUnsavedChanges(true);
            }}
            outlineId={outlineId}
            projectSlug={slug}
            entityType="concept"
            entityId={id}
          />
        ) : activeProblemTab === 'statement' ? (
          <WordgardDocumentEditor
            key="problem-statement-editor"
            ref={editorRef}
            initialContent={problemStatement}
            onChange={(html) => {
              setProblemStatement(html);
              setHasUnsavedChanges(true);
            }}
            outlineId={outlineId}
            projectSlug={slug}
            entityType="problem"
            entityId={id}
          />
        ) : (
          <WordgardDocumentEditor
            key="problem-solution-editor"
            ref={editorRef}
            initialContent={problemSolution}
            onChange={(html) => {
              setProblemSolution(html);
              setHasUnsavedChanges(true);
            }}
            outlineId={outlineId}
            projectSlug={slug}
            entityType="problem"
            entityId={id}
          />
        )}
      </main>
    </div>
  );
};
