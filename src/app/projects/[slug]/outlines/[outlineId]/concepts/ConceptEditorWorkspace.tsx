'use client';

import React, { useState } from 'react';
import { saveConceptsListAction } from '@/app/actions/projects';
import { useToast } from '@/components/Toast';
import { MathRenderer } from '@/components/MathRenderer';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { ConfirmModal } from '@/components/ConfirmModal';
import { cryptoNativeUUID } from '@/lib/utils';
import {
  Save,
  Eye,
  BookOpen,
  Loader2,
  Edit2,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export interface ConceptItem {
  id: string;
  title: string;
  content: string;
  status?: string;
  is_deleted?: number | boolean;
}

interface ConceptEditorWorkspaceProps {
  outlineId: string;
  slug: string;
  initialDescription: string;
  initialConceptsJson?: string | null;
}

export const ConceptEditorWorkspace: React.FC<ConceptEditorWorkspaceProps> = ({
  outlineId,
  slug,
  initialDescription,
  initialConceptsJson,
}) => {
  const { toast } = useToast();

  const [concepts, setConcepts] = useState<ConceptItem[]>(() => {
    if (initialConceptsJson) {
      try {
        const parsed = JSON.parse(initialConceptsJson);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<ConceptItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [conceptToDeleteId, setConceptToDeleteId] = useState<string | null>(null);

  const activeConcepts = concepts.filter((c) => !c.is_deleted);

  const handleOpenAdd = () => {
    setEditingItem({ id: cryptoNativeUUID(), title: '', content: '' });
    setTitle('');
    setContent('');
    setIsEditing(true);
  };

  const handleOpenEdit = (item: ConceptItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setIsEditing(true);
  };

  const handleDeleteConfirm = async () => {
    if (!conceptToDeleteId) return;
    const updated = concepts.map((c) =>
      c.id === conceptToDeleteId ? { ...c, is_deleted: 1 } : c
    );
    setConcepts(updated);
    setIsPending(true);
    const res = await saveConceptsListAction(outlineId, updated);
    setIsPending(false);
    setConceptToDeleteId(null);

    if (res.error) {
      toast('Delete Failed', res.error, 'error');
    } else {
      toast('Concept Deleted', 'Soft-deleted concept card from subchapter.', 'info');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    let updated: ConceptItem[];
    if (editingItem && concepts.some((c) => c.id === editingItem.id)) {
      updated = concepts.map((c) =>
        c.id === editingItem.id ? { ...c, title: title.trim(), content: content.trim() } : c
      );
    } else {
      updated = [
        ...concepts,
        { id: cryptoNativeUUID(), title: title.trim(), content: content.trim(), is_deleted: 0, status: 'unread' },
      ];
    }

    setConcepts(updated);
    setIsPending(true);
    const res = await saveConceptsListAction(outlineId, updated);
    setIsPending(false);

    if (res.error) {
      toast('Save Failed', res.error, 'error');
    } else {
      toast('Concepts Saved', 'Saved concept details with LaTeX math.', 'success');
      setIsEditing(false);
      setEditingItem(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Concept Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Subchapter Core Concepts ({activeConcepts.length})</span>
          </h2>
          <p className="text-xs text-slate-500">
            Define multiple core theory cards, theorems, and LaTeX formula derivations.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all m3-ripple"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Concept Card</span>
        </button>
      </div>

      {/* Editor Modal / Drawer */}
      {isEditing && (
        <form onSubmit={handleSaveItem} className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>{editingItem?.title ? 'Edit Concept Card' : 'New Concept Card'}</span>
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Concept Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Order Properties & Absolute Value"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Concept Theory & Formulas (LaTeX Markdown $...$ or $$...$$)
                </label>
                <textarea
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  placeholder="e.g. Definition of Absolute Value:\n$$|x| = \\begin{cases} x & x \\ge 0 \\\\ -x & x < 0 \\end{cases}$$"
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live KaTeX Math Preview</span>
                </label>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 min-h-[210px] text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  {content ? (
                    <MathRenderer content={content} />
                  ) : (
                    <span className="text-slate-400 italic">Live math formulas will render here in real-time...</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
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
              <span>Save Concept</span>
            </button>
          </div>
        </form>
      )}

      {/* List of Concept Cards or Lottie Empty State */}
      {activeConcepts.length === 0 ? (
        <LottieEmptyState
          title="No Concept Cards Added Yet"
          message="Click 'Add New Concept Card' to create core theory cards, theorems, and LaTeX formula derivations for this subchapter."
          actionText="Add New Concept Card"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="space-y-4">
          {activeConcepts.map((item, idx) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 space-y-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="Edit concept card"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConceptToDeleteId(item.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Soft delete concept card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                <MathRenderer content={item.content} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Soft Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(conceptToDeleteId)}
        title="Delete Concept Card"
        message="Are you sure you want to soft delete this concept card from the subchapter?"
        confirmText="Soft Delete Concept"
        danger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setConceptToDeleteId(null)}
      />
    </div>
  );
};

