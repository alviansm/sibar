'use client';

import React, { useState } from 'react';
import {
  createOutlineNodeAction,
  updateOutlineNodeAction,
  deleteOutlineNodeAction,
} from '@/app/actions/projects';
import { Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight, FolderPlus, FilePlus, Loader2 } from 'lucide-react';

interface OutlineTreeEditorProps {
  projectId: string;
  initialOutlines: any[];
}

import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';
import { PictureToTaxonomyModal } from './PictureToTaxonomyModal';

export const OutlineTreeEditor: React.FC<OutlineTreeEditorProps> = ({
  projectId,
  initialOutlines,
}) => {
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSort, setEditSort] = useState(0);

  const [addingParentId, setAddingParentId] = useState<string | null | 'ROOT'>(null);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [isPending, setIsPending] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<{ id: string; code: string; title: string; isChapter: boolean } | null>(null);

  const chapters = initialOutlines.filter((o) => o.parent_id === null);

  const handleStartEdit = (node: any) => {
    setEditingId(node.id);
    setEditCode(node.code);
    setEditTitle(node.title);
    setEditDesc(node.description || '');
    setEditSort(node.sort_order || 0);
  };

  const handleSaveEdit = async (id: string) => {
    setIsPending(true);
    await updateOutlineNodeAction(id, editCode, editTitle, editDesc, editSort);
    setIsPending(false);
    setEditingId(null);
    toast('Node Updated', 'Outline node details saved.', 'success');
  };

  const handleConfirmDelete = async () => {
    if (!nodeToDelete) return;

    setIsPending(true);
    const res = await deleteOutlineNodeAction(nodeToDelete.id);
    setIsPending(false);

    if (res.error) {
      toast('Delete Failed', res.error, 'error');
    } else {
      toast(
        'Node Soft-Deleted',
        `Successfully soft-deleted '${nodeToDelete.code} ${nodeToDelete.title}' and associated problem sets.`,
        'info'
      );
      setNodeToDelete(null);
    }
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newTitle) return;

    setIsPending(true);
    const parentId = addingParentId === 'ROOT' ? null : addingParentId;
    await createOutlineNodeAction(projectId, parentId, newCode, newTitle, newDesc, 0);
    setIsPending(false);
    setAddingParentId(null);
    setNewCode('');
    setNewTitle('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Header: Add Chapter & Picture to Taxonomy AI */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chapter Hierarchy</span>
        
        <div className="flex items-center gap-2">
          <PictureToTaxonomyModal projectId={projectId} />
          
          <button
            onClick={() => {
              setAddingParentId('ROOT');
              setNewCode(`Ch ${chapters.length}`);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800 flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Main Chapter</span>
          </button>
        </div>
      </div>

      {/* Root Addition Modal/Form */}
      {addingParentId === 'ROOT' && (
        <form onSubmit={handleAddNode} className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300">
            <span>Add New Main Chapter</span>
            <button type="button" onClick={() => setAddingParentId(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Code (e.g. Ch 2)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              required
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
            <input
              type="text"
              placeholder="Title (e.g. Derivatives)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="sm:col-span-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
            >
              {isPending ? 'Saving...' : 'Add Chapter'}
            </button>
          </div>
        </form>
      )}

      {/* Chapters & Subchapters List */}
      <div className="space-y-4">
        {chapters.map((ch) => {
          const children = initialOutlines.filter((o) => o.parent_id === ch.id);
          const isEditingCh = editingId === ch.id;

          return (
            <div key={ch.id} className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
              
              {/* Chapter Node Item */}
              {isEditingCh ? (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="sm:col-span-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-bold"
                    />
                    <input
                      type="number"
                      value={editSort}
                      onChange={(e) => setEditSort(Number(e.target.value))}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-slate-500">Cancel</button>
                    <button onClick={() => handleSaveEdit(ch.id)} className="px-3 py-1 text-xs bg-indigo-600 text-white font-semibold rounded-lg">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      {ch.code}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{ch.title}</span>
                    {ch.description && (
                      <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-xs">- {ch.description}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setAddingParentId(ch.id);
                        setNewCode(`${ch.code.replace('Ch ', '')}.1`);
                      }}
                      title="Add Subchapter"
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                    >
                      <FilePlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(ch)}
                      title="Edit Node"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setNodeToDelete({ id: ch.id, code: ch.code, title: ch.title, isChapter: true })}
                      title="Delete Node"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Child Subchapter Addition Form */}
              {addingParentId === ch.id && (
                <form onSubmit={handleAddNode} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 space-y-2 ml-4">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    <span>Add Subchapter to {ch.code}</span>
                    <button type="button" onClick={() => setAddingParentId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Code (e.g. 2.1)"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      required
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Title (e.g. Tangent Lines)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      className="sm:col-span-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="submit" disabled={isPending} className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg">
                      {isPending ? 'Saving...' : 'Add Subchapter'}
                    </button>
                  </div>
                </form>
              )}

              {/* Subchapters */}
              <div className="pl-4 space-y-2 border-l border-slate-200 dark:border-slate-800 ml-2">
                {children.map((sub) => {
                  const isEditingSub = editingId === sub.id;

                  if (isEditingSub) {
                    return (
                      <div key={sub.id} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-mono"
                          />
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="sm:col-span-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs font-bold"
                          />
                          <input
                            type="number"
                            value={editSort}
                            onChange={(e) => setEditSort(Number(e.target.value))}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-slate-500">Cancel</button>
                          <button onClick={() => handleSaveEdit(sub.id)} className="px-3 py-1 text-xs bg-indigo-600 text-white font-semibold rounded-lg">Save</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={sub.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-500">{sub.code}</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{sub.title}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button onClick={() => handleStartEdit(sub)} className="p-1 text-slate-400 hover:text-slate-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setNodeToDelete({ id: sub.id, code: sub.code, title: sub.title, isChapter: false })}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* Custom Soft Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(nodeToDelete)}
        title={nodeToDelete?.isChapter ? 'Delete Chapter Node?' : 'Delete Subchapter Node?'}
        message={
          nodeToDelete?.isChapter
            ? `Are you sure you want to soft-delete '${nodeToDelete.code} ${nodeToDelete.title}'? All child subchapters and associated problem sets will be soft-deleted from the active archive.`
            : `Are you sure you want to soft-delete '${nodeToDelete?.code} ${nodeToDelete?.title}'? All associated problem sets will be soft-deleted.`
        }
        confirmText="Soft Delete"
        cancelText="Cancel"
        danger={true}
        loading={isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setNodeToDelete(null)}
      />

    </div>
  );
};
