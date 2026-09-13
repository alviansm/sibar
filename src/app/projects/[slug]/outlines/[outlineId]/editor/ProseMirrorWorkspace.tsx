'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ProseMirrorDocumentEditor,
  ProseMirrorDocumentEditorRef,
} from '@/components/ProseMirrorDocumentEditor';
import { saveSingleConceptAction } from '@/app/actions/projects';
import { createProblemAction, updateProblemAction } from '@/app/actions/problems';
import { useToast } from '@/components/Toast';
import {
  BookOpen,
  Sparkles,
  CheckSquare,
  Square,
  Plus,
  Trash2,
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

interface ProseMirrorWorkspaceProps {
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

export const ProseMirrorWorkspace: React.FC<ProseMirrorWorkspaceProps> = ({
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

  // Problem state (for worked example or exercise)
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

  const editorRef = useRef<ProseMirrorDocumentEditorRef>(null);

  const handleSave = async (returnAfterSave = false) => {
    setIsSaving(true);

    try {
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
        const finalStatement =
          activeProblemTab === 'statement'
            ? latestEditorHtml || problemStatement
            : problemStatement;
        const finalSolution =
          activeProblemTab === 'solution'
            ? latestEditorHtml || problemSolution
            : problemSolution;

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

  // Meta controls for Problem / Example
  const problemMetaControls =
    type !== 'concept' ? (
      <div className="space-y-2 py-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Section Switcher: Statement vs Solution */}
          <div className="flex items-center gap-1 bg-[#EDF2FA] p-1 rounded-xl">
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeProblemTab === 'statement'
                  ? 'bg-white text-[#1A73E8] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeProblemTab === 'solution'
                  ? 'bg-white text-[#1A73E8] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Solution Guide</span>
            </button>
          </div>

          {/* Type & Difficulty Selection */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <span>Type:</span>
              <select
                value={problemType}
                onChange={(e) => {
                  setProblemType(e.target.value as any);
                  setHasUnsavedChanges(true);
                }}
                className="px-2 py-1 bg-white border border-[#C4C7C5] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="calculation">Calculation</option>
                <option value="derivation">Derivation</option>
                <option value="essay">Essay / Freeform</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-slate-600">
              <span>Difficulty:</span>
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(Number(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                className="px-2 py-1 bg-white border border-[#C4C7C5] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
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

        {/* Multiple Choice Options Key Builder */}
        {problemType === 'multiple_choice' && activeProblemTab === 'statement' && (
          <div className="bg-[#F8F9FA] border border-[#E0E3E7] rounded-xl p-3 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Multiple Choice Options &amp; Correct Answer Key</span>
              </span>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs font-bold text-[#1A73E8] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {optionsList.map((opt, oIdx) => {
                const isKey = correctOptionIndices.includes(oIdx);
                return (
                  <div key={oIdx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrectIndex(oIdx)}
                      className={`p-1.5 rounded-lg border transition-all flex-shrink-0 ${
                        isKey
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-slate-400 border-slate-300 hover:border-slate-400'
                      }`}
                      title={isKey ? 'Correct answer key' : 'Click to mark as correct key'}
                    >
                      {isKey ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
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
                      placeholder={`Option ${String.fromCharCode(65 + oIdx)} (LaTeX supported)`}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono min-w-0 focus:outline-none focus:border-[#1A73E8]"
                    />

                    {optionsList.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(oIdx)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    ) : null;

  const documentTitle =
    type === 'concept'
      ? conceptTitle
      : type === 'example'
      ? `Worked Example: ${subchapterCode} - ${subchapterTitle}`
      : `Exercise Problem: ${subchapterCode} - ${subchapterTitle}`;

  return (
    <div className="min-h-screen bg-[#F0F4F9]">
      {type === 'concept' ? (
        <ProseMirrorDocumentEditor
          key="concept-editor"
          ref={editorRef}
          initialContent={conceptContent}
          onChange={(html) => {
            setConceptContent(html);
            setHasUnsavedChanges(true);
          }}
          title={conceptTitle}
          onTitleChange={(newTitle) => {
            setConceptTitle(newTitle);
            setHasUnsavedChanges(true);
          }}
          onSave={() => handleSave(false)}
          onSaveAndReturn={() => handleSave(true)}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSavedTime={lastSavedTime}
          returnUrl={returnUrl}
          outlineId={outlineId}
          projectSlug={slug}
          entityType="concept"
          entityId={id}
        />
      ) : activeProblemTab === 'statement' ? (
        <ProseMirrorDocumentEditor
          key="problem-statement-editor"
          ref={editorRef}
          initialContent={problemStatement}
          onChange={(html) => {
            setProblemStatement(html);
            setHasUnsavedChanges(true);
          }}
          title={documentTitle}
          onSave={() => handleSave(false)}
          onSaveAndReturn={() => handleSave(true)}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSavedTime={lastSavedTime}
          returnUrl={returnUrl}
          outlineId={outlineId}
          projectSlug={slug}
          entityType="problem"
          entityId={id}
          metaControls={problemMetaControls}
        />
      ) : (
        <ProseMirrorDocumentEditor
          key="problem-solution-editor"
          ref={editorRef}
          initialContent={problemSolution}
          onChange={(html) => {
            setProblemSolution(html);
            setHasUnsavedChanges(true);
          }}
          title={`${documentTitle} (Solution)`}
          onSave={() => handleSave(false)}
          onSaveAndReturn={() => handleSave(true)}
          isSaving={isSaving}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSavedTime={lastSavedTime}
          returnUrl={returnUrl}
          outlineId={outlineId}
          projectSlug={slug}
          entityType="problem"
          entityId={id}
          metaControls={problemMetaControls}
        />
      )}
    </div>
  );
};
