'use client';

import React, { useState } from 'react';
import { updateProjectAction } from '@/app/actions/projects';
import { Save, Check, Loader2 } from 'lucide-react';
import { WORKSPACE_CATEGORIES } from '@/lib/constants';
import { WorkspaceImageUploader } from '@/components/WorkspaceImageUploader';

interface ProjectSettingsFormProps {
  project: any;
}

export const ProjectSettingsForm: React.FC<ProjectSettingsFormProps> = ({ project }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [category, setCategory] = useState<string>(project.category || 'General');
  const [isCustomCategory, setIsCustomCategory] = useState(
    Boolean(project.category && !WORKSPACE_CATEGORIES.includes(project.category as any))
  );
  const [customCategoryText, setCustomCategoryText] = useState(project.category || '');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(project.thumbnail_url || null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const finalCategory = isCustomCategory ? (customCategoryText.trim() || 'General') : category;
    formData.set('category', finalCategory);
    formData.set('thumbnail_url', thumbnailUrl || '');

    const res = await updateProjectAction(project.id, formData);

    setIsPending(false);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>Workspace metadata &amp; visual appearance updated successfully!</span>
        </div>
      )}

      {/* Basic Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Project / Workspace Name
          </label>
          <input
            type="text"
            name="name"
            defaultValue={project.name}
            required
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Study Status
          </label>
          <select
            name="status"
            defaultValue={project.status}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="active">Active (In Training)</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed (Mastered)</option>
          </select>
        </div>
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Discipline / Category
          </label>
          <button
            type="button"
            onClick={() => setIsCustomCategory(!isCustomCategory)}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {isCustomCategory ? 'Pick preset category' : '+ Enter custom category'}
          </button>
        </div>

        {!isCustomCategory ? (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {WORKSPACE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={customCategoryText}
            onChange={(e) => setCustomCategoryText(e.target.value)}
            placeholder="e.g. Topology, Fluid Mechanics, Quantum Optics..."
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>

      {/* Workspace Thumbnail */}
      <WorkspaceImageUploader
        value={thumbnailUrl}
        onChange={setThumbnailUrl}
        label="Workspace Card Thumbnail (< 1 MB)"
      />

      {/* Reference Material */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
          Reference Material / Textbook
        </label>
        <input
          type="text"
          name="reference_material"
          defaultValue={project.reference_material}
          required
          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Target Milestone */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
          Target Milestone Goal
        </label>
        <input
          type="text"
          name="target_milestone"
          defaultValue={project.target_milestone}
          required
          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-2xl shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Workspace Changes</span>
        </button>
      </div>
    </form>
  );
};
