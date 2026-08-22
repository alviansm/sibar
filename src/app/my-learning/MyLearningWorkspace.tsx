'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, BookOpen, Sparkles, Plus, CheckCircle2, Clock, Layers, X, RotateCcw } from 'lucide-react';
import { ProjectCard, ProjectCardData } from '@/components/ProjectCard';
import { NewProjectModal } from '@/app/dashboard/NewProjectModal';

interface MyLearningWorkspaceProps {
  initialProjects: ProjectCardData[];
}

type SortOption = 'last_accessed' | 'newest' | 'alphabetical' | 'progress_desc' | 'progress_asc';
type StatusFilter = 'all' | 'active' | 'completed' | 'paused';

export const MyLearningWorkspace: React.FC<MyLearningWorkspaceProps> = ({ initialProjects }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('last_accessed');

  // Compute available categories with project counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const proj of initialProjects) {
      const cat = proj.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [initialProjects]);

  const categoryList = useMemo(() => {
    return Object.keys(categoriesWithCounts).sort();
  }, [categoriesWithCounts]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...initialProjects];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          p.reference_material.toLowerCase().includes(q) ||
          p.target_milestone.toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter((p) => (p.category || 'General') === selectedCategory);
    }

    // 3. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // 4. Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'last_accessed': {
          const aTime = a.last_accessed_at || a.created_at || 0;
          const bTime = b.last_accessed_at || b.created_at || 0;
          return bTime - aTime;
        }
        case 'newest':
          return (b.created_at || 0) - (a.created_at || 0);
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'progress_desc':
          return b.progressPct - a.progressPct;
        case 'progress_asc':
          return a.progressPct - b.progressPct;
        default:
          return 0;
      }
    });

    return result;
  }, [initialProjects, searchQuery, selectedCategory, statusFilter, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setStatusFilter('all');
    setSortBy('last_accessed');
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || statusFilter !== 'all' || sortBy !== 'last_accessed';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Curriculum &amp; Self-Learning Tracks</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            My Learning &amp; Workspaces
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Access your structured cognitive training tracks, review chapter mastery, and continue worked problem derivations.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <NewProjectModal buttonLabel="Add New Project" />
        </div>
      </div>

      {/* Filter, Search & Sort Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-m3-1 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your workspaces by title, reference book, milestone, or topic..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort & Status Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'active'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                In Training
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  statusFilter === 'completed'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Mastered
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-2xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-400 font-medium hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="last_accessed">Last Opened</option>
                <option value="newest">Recently Added</option>
                <option value="alphabetical">Title (A-Z)</option>
                <option value="progress_desc">Mastery (High to Low)</option>
                <option value="progress_asc">Mastery (Low to High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
            <Filter className="w-3 h-3" />
            <span>Category:</span>
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>All Categories</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
              {initialProjects.length}
            </span>
          </button>

          {categoryList.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count = categoriesWithCounts[cat] || 0;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Meta & Active Filters Summary */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <span>Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredProjects.length}</strong> of {initialProjects.length} study tracks</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Study Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-m3-1">
          <BookOpen className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No study projects found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
              ? 'No study tracks matched your current search or category filter criteria. Try resetting filters or searching with different keywords.'
              : 'You haven’t initialized any study tracks yet. Create your first syllabus project to begin.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Clear Filters
              </button>
            )}
            <NewProjectModal buttonLabel="Create Study Project" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((proj) => (
            <ProjectCard key={proj.id} project={proj} />
          ))}
        </div>
      )}
    </div>
  );
};
