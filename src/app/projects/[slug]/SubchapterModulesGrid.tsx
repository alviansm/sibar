'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GripVertical,
  BookOpen,
  FileCode,
  Play,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  X,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import { MathRenderer } from '@/components/MathRenderer';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { toggleConceptStatusAction } from '@/app/actions/projects';
import { useToast } from '@/components/Toast';

export interface CardItem {
  id: string;
  type: 'concept' | 'problem';
  title: string;
  subtitle?: string;
  content: string;
  status: 'unread' | 'completed' | 'not_attempted' | 'solved' | 'surrendered';
  originalData: any;
}

interface SubchapterModulesGridProps {
  activeSubchapter: any;
  slug: string;
  activeProblems: any[];
}

export const SubchapterModulesGrid: React.FC<SubchapterModulesGridProps> = ({
  activeSubchapter,
  slug,
  activeProblems,
}) => {
  const { toast } = useToast();
  const [filterMode, setFilterMode] = useState<'all' | 'concepts' | 'problems'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  const toggleSolution = (id: string) => {
    setExpandedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Parse Concept Cards
  const conceptItems: CardItem[] = React.useMemo(() => {
    let list: any[] = [];
    if (activeSubchapter?.concepts_json) {
      try {
        const parsed = JSON.parse(activeSubchapter.concepts_json);
        if (Array.isArray(parsed)) list = parsed.filter((item: any) => !item.is_deleted);
      } catch (e) {}
    }

    return list.map((item, idx) => ({
      id: item.id || `concept-${idx}`,
      type: 'concept' as const,
      title: item.title || `Concept #${idx + 1}`,
      content: item.content || '',
      status: item.status === 'completed' ? 'completed' : 'unread',
      originalData: item,
    }));
  }, [activeSubchapter]);

  // 2. Parse Problem Cards
  const problemItems: CardItem[] = React.useMemo(() => {
    return activeProblems.map((prob, idx) => {
      let status: 'not_attempted' | 'solved' | 'surrendered' = 'not_attempted';
      let statusLabel = 'Not Attempted';

      if (prob.status === 'solved') {
        status = 'solved';
        statusLabel = 'Solved Clean';
      } else if (prob.status === 'surrendered') {
        status = 'surrendered';
        statusLabel = 'Incorrect Answer';
      }

      return {
        id: prob.id,
        type: 'problem' as const,
        title: `Problem #${idx + 1}: ${prob.problem_type.replace('_', ' ').toUpperCase()}`,
        subtitle: `Difficulty ${prob.difficulty}/5 • ${statusLabel}`,
        content: prob.problem_statement,
        status,
        originalData: prob,
      };
    });
  }, [activeProblems]);

  // 3. Combine & Sort Cards
  const STORAGE_KEY = `sibar_card_order_${activeSubchapter.id}`;
  const [allCards, setAllCards] = useState<CardItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const combined = [...conceptItems, ...problemItems];
    try {
      const savedOrder: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (savedOrder && savedOrder.length > 0) {
        combined.sort((a, b) => {
          const idxA = savedOrder.indexOf(a.id);
          const idxB = savedOrder.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return 0;
        });
      }
    } catch (e) {}

    setAllCards(combined);
  }, [conceptItems, problemItems, STORAGE_KEY]);

  // Handle concept completion toggle
  const handleToggleConceptStatus = async (conceptId: string) => {
    const res = await toggleConceptStatusAction(activeSubchapter.id, conceptId);
    if (res.error) {
      toast('Error', res.error, 'error');
    } else {
      const isCompleted = res.newStatus === 'completed';
      toast(
        isCompleted ? 'Marked as Completed' : 'Marked as Unread',
        isCompleted ? 'Progress ring updated in syllabus taxonomy.' : 'Concept reset to unread.',
        isCompleted ? 'success' : 'info'
      );
    }
  };

  // Filter Cards
  const filteredCards = allCards.filter((card) => {
    if (filterMode === 'concepts' && card.type !== 'concept') return false;
    if (filterMode === 'problems' && card.type !== 'problem') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchContent = card.content.toLowerCase().includes(q);
      const matchSub = card.subtitle?.toLowerCase().includes(q);
      return matchTitle || matchContent || matchSub;
    }

    return true;
  });

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newCards = [...filteredCards];
    const [moved] = newCards.splice(draggedIndex, 1);
    newCards.splice(dropIndex, 0, moved);

    setAllCards(newCards);
    setDraggedIndex(null);

    try {
      const orderIds = newCards.map((c) => c.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orderIds));
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      
      {/* Control Panel: Filter Tabs & Live Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-m3-1">
        
        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>All Items ({allCards.length})</span>
          </button>

          <button
            onClick={() => setFilterMode('concepts')}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 ${
              filterMode === 'concepts'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Concepts &amp; Worked Examples ({conceptItems.length})</span>
          </button>

          <button
            onClick={() => setFilterMode('problems')}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 ${
              filterMode === 'problems'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Exercises / Problem Sets ({problemItems.length})</span>
          </button>
        </div>

        {/* Live Search Bar */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search formulas, concepts, or exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* Helper Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-2">
        <span>
          SHOWING {filterMode.toUpperCase()} ({filteredCards.length})
        </span>
        <span>Drag ⋮⋮ to reorder cards</span>
      </div>

      {/* Cards List Grid */}
      {filteredCards.length === 0 ? (
        <LottieEmptyState
          title={searchQuery ? 'No Matching Results' : 'No Items in Category'}
          message={
            searchQuery
              ? `No concept formulas or problem statements matched "${searchQuery}".`
              : `This subchapter currently has no ${filterMode} items.`
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredCards.map((card, index) => {
            const isDragging = draggedIndex === index;

            // CONCEPT CARD
            if (card.type === 'concept') {
              const isCompleted = card.status === 'completed';
              const examples = card.originalData?.examples || [];

              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-4 group relative ${
                    isDragging ? 'opacity-40 scale-[0.99] border-dashed border-indigo-500' : ''
                  }`}
                >
                  {/* Concept Top Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Drag to reorder card"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <div className="relative group/tooltip">
                        <span
                          className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:shadow-md hover:shadow-indigo-500/20 cursor-pointer"
                          title="Concept"
                        >
                          <BookOpen className="w-4 h-4" />
                        </span>
                        <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-semibold rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-10 shadow-md">
                          Concept
                        </div>
                      </div>

                      {/* Status Indicator Chip */}
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          <HelpCircle className="w-3.5 h-3.5" /> Unread
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSolution(`concept-expand-${card.id}`)}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {expandedSolutions[`concept-expand-${card.id}`] ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Collapse Card</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Read &amp; Complete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Concept Body */}
                  <div
                    className="space-y-3 cursor-pointer select-none"
                    onClick={() => toggleSolution(`concept-expand-${card.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 flex-shrink-0 transition-transform duration-200 hover:scale-110 cursor-pointer shadow-xs" title="Concept">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        {card.title}
                      </h3>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                      <MathRenderer content={card.content} />
                    </div>
                  </div>

                  {/* Expanded Concept View: Example Problems + Mark Completed Action Button */}
                  {expandedSolutions[`concept-expand-${card.id}`] && (
                    <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                      {/* Embedded Concept Example Problems */}
                      {examples.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="relative group/tooltip">
                              <span
                                className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-amber-100 dark:hover:bg-amber-900 hover:shadow-md cursor-pointer"
                                title="Problem Example"
                              >
                                <Lightbulb className="w-4 h-4" />
                              </span>
                              <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-semibold rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-10 shadow-md">
                                Problem Example
                              </div>
                            </div>
                          </div>
                          {examples.map((ex: any, exIdx: number) => {
                            const isExpanded = expandedSolutions[`${card.id}-ex-${exIdx}`];
                            return (
                              <div
                                key={ex.id || exIdx}
                                className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3 text-xs"
                              >
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">#{exIdx + 1}</span>
                                  {ex.title && <span>{ex.title}</span>}
                                </div>
                                <MathRenderer content={ex.statement || ex.problem_statement} />

                                <div>
                                  <button
                                    onClick={() => toggleSolution(`${card.id}-ex-${exIdx}`)}
                                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                                  >
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    <span>{isExpanded ? 'Hide Solution Steps' : 'View Solution Hint & Steps'}</span>
                                  </button>

                                  {isExpanded && (
                                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 space-y-2 animate-in fade-in duration-150">
                                      {ex.hint && (
                                        <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                          <span className="font-bold uppercase tracking-wider">Hint:</span> {ex.hint}
                                        </div>
                                      )}
                                      <MathRenderer content={ex.solution || ex.solution_guide || 'Solution steps.'} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Completion Button Placement AFTER reading the box */}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleToggleConceptStatus(card.id)}
                          className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                            isCompleted
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>{isCompleted ? 'Mark Concept as Unread' : 'Mark Concept as Completed'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            }

            // PROBLEM SET CARD
            if (card.type === 'problem') {
              const prob = card.originalData;

              let statusBadge = (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                  <HelpCircle className="w-3.5 h-3.5" /> Not Attempted
                </span>
              );

              if (prob.status === 'solved') {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Solved Clean
                  </span>
                );
              } else if (prob.status === 'surrendered') {
                statusBadge = (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" /> Incorrect / Surrendered
                  </span>
                );
              }

              let optionsList: string[] = [];
              if (prob.options_json) {
                try {
                  optionsList = JSON.parse(prob.options_json);
                } catch (e) {}
              }

              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-4 group relative ${
                    isDragging ? 'opacity-40 scale-[0.99] border-dashed border-indigo-500' : ''
                  }`}
                >
                  {/* Card Top Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Drag to reorder card"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <div className="relative group/tooltip">
                        <span
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-md cursor-pointer"
                          title="Exercise"
                        >
                          <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </span>
                        <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-semibold rounded-md opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap z-10 shadow-md">
                          Exercise
                        </div>
                      </div>
                      <span className="text-xs font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60">
                        {prob.problem_type.replace('_', ' ')}
                      </span>
                      {statusBadge}
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/projects/${slug}/outlines/${activeSubchapter.id}/exercise/${prob.exercise_id || prob.id}/lobby`}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all m3-ripple"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Exercise</span>
                      </Link>
                    </div>
                  </div>

                  {/* Problem Statement */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                      <MathRenderer content={card.content} />
                    </div>

                    {/* Multiple Choice Options Preview (Neutral anti-spoiler styling) */}
                    {optionsList.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {optionsList.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-2"
                          >
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 font-mono">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <MathRenderer content={opt} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
};
