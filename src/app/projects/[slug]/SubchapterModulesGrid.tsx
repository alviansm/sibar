'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GripVertical,
  BookOpen,
  FileCode,
  Play,
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
  Layers,
  Eye,
  EyeOff,
  Edit3,
  Award,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { MathRenderer } from '@/components/MathRenderer';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { toggleConceptStatusAction } from '@/app/actions/projects';
import { useToast } from '@/components/Toast';

export interface CardItem {
  id: string;
  type: 'concept' | 'example' | 'exercise';
  title: string;
  subtitle?: string;
  content: string;
  status: 'unread' | 'completed' | 'not_attempted' | 'solved' | 'surrendered';
  originalData: any;
}

interface SubchapterModulesGridProps {
  activeSubchapter: any;
  slug: string;
  activeExamples: any[];
  activeExerciseSets: any[];
}

export const SubchapterModulesGrid: React.FC<SubchapterModulesGridProps> = ({
  activeSubchapter,
  slug,
  activeExamples,
  activeExerciseSets,
}) => {
  const { toast } = useToast();
  const [filterMode, setFilterMode] = useState<'all' | 'concepts' | 'examples' | 'exercises'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const toggleSolution = (id: string) => {
    setRevealedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Concept Cards
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

  // 2. Example Cards
  const exampleItems: CardItem[] = React.useMemo(() => {
    return activeExamples.map((prob, idx) => ({
      id: prob.id,
      type: 'example' as const,
      title: `Example #${idx + 1}: ${prob.problem_type.replace('_', ' ').toUpperCase()}`,
      subtitle: `Difficulty ${prob.difficulty}/5`,
      content: prob.problem_statement,
      status: prob.status || 'not_attempted',
      originalData: prob,
    }));
  }, [activeExamples]);

  // 3. Exercise Cards (one card per set)
  const exerciseItems: CardItem[] = React.useMemo(() => {
    return activeExerciseSets.map((exSet) => ({
      id: exSet.id,
      type: 'exercise' as const,
      title: exSet.title,
      subtitle: `${exSet.questionCount} Questions · Passing: ${exSet.passing_grade}%`,
      content: exSet.description || '',
      status: 'not_attempted' as const,
      originalData: exSet,
    }));
  }, [activeExerciseSets]);

  // Combined & ordered
  const STORAGE_KEY = `sibar_card_order_${activeSubchapter.id}`;
  const [allCards, setAllCards] = useState<CardItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const combined = [...conceptItems, ...exampleItems, ...exerciseItems];
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
  }, [conceptItems, exampleItems, exerciseItems, STORAGE_KEY]);

  const handleToggleConceptStatus = async (conceptId: string) => {
    const res = await toggleConceptStatusAction(activeSubchapter.id, conceptId);
    if (res.error) {
      toast('Error', res.error, 'error');
    } else {
      const isCompleted = res.newStatus === 'completed';
      toast(
        isCompleted ? 'Marked as Completed' : 'Marked as Unread',
        isCompleted ? 'Progress ring updated.' : 'Concept reset to unread.',
        isCompleted ? 'success' : 'info'
      );
    }
  };

  // Filter
  const filteredCards = allCards.filter((card) => {
    if (filterMode === 'concepts' && card.type !== 'concept') return false;
    if (filterMode === 'examples' && card.type !== 'example') return false;
    if (filterMode === 'exercises' && card.type !== 'exercise') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        card.title.toLowerCase().includes(q) ||
        card.content.toLowerCase().includes(q) ||
        (card.subtitle?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  // Drag & drop
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards.map((c) => c.id)));
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-m3-1">

        {/* 4 Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>All ({allCards.length})</span>
          </button>

          <button
            onClick={() => setFilterMode('concepts')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterMode === 'concepts'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Concepts ({conceptItems.length})</span>
          </button>

          <button
            onClick={() => setFilterMode('examples')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterMode === 'examples'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Examples ({exampleItems.length})</span>
          </button>

          <button
            onClick={() => setFilterMode('exercises')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filterMode === 'exercises'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Exercises ({exerciseItems.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search formulas, concepts, exercises..."
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
        <span>SHOWING {filterMode.toUpperCase()} ({filteredCards.length})</span>
        <span>Drag ⋮⋮ to reorder cards</span>
      </div>

      {/* Cards */}
      {filteredCards.length === 0 ? (
        <LottieEmptyState
          title={searchQuery ? 'No Matching Results' : 'Nothing Here Yet'}
          message={
            searchQuery
              ? `No items matched "${searchQuery}".`
              : filterMode === 'examples'
              ? 'No example problems yet. Add one via the Problem Builder in the subchapter settings.'
              : filterMode === 'exercises'
              ? 'No exercise sets yet. Click "+ Add Exercise Set" to create one.'
              : `This subchapter has no ${filterMode} items yet.`
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredCards.map((card, index) => {
            const isDragging = draggedIndex === index;

            // ── CONCEPT CARD ───────────────────────────────────────────────
            if (card.type === 'concept') {
              const isCompleted = card.status === 'completed';
              const examples = card.originalData?.examples || [];
              const isExpanded = Boolean(expandedCards[`concept-${card.id}`]);

              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all space-y-4 ${
                    isDragging ? 'opacity-40 scale-[0.99] border-dashed border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                        <BookOpen className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/40">CONCEPT</span>
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          <HelpCircle className="w-3.5 h-3.5" /> Unread
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleExpand(`concept-${card.id}`)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{isExpanded ? 'Collapse' : 'Read & Complete'}</span>
                    </button>
                  </div>

                  <div className="cursor-pointer" onClick={() => toggleExpand(`concept-${card.id}`)}>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight mb-2">{card.title}</h3>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                      <MathRenderer content={card.content} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                      {examples.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200/60">
                              <Lightbulb className="w-4 h-4" />
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Worked Examples</span>
                          </div>
                          {examples.map((ex: any, exIdx: number) => {
                            const exKey = `${card.id}-ex-${exIdx}`;
                            const isExExpanded = Boolean(expandedCards[exKey]);
                            return (
                              <div key={ex.id || exIdx} className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3 text-xs">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span className="font-mono text-amber-600">#{exIdx + 1}</span>
                                  {ex.title && <span>{ex.title}</span>}
                                </div>
                                <MathRenderer content={ex.statement || ex.problem_statement} />
                                <div>
                                  <button
                                    onClick={() => toggleExpand(exKey)}
                                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                                  >
                                    {isExExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    <span>{isExExpanded ? 'Hide Solution' : 'Show Solution Steps'}</span>
                                  </button>
                                  {isExExpanded && (
                                    <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 animate-in fade-in duration-150">
                                      {ex.hint && <div className="text-[11px] font-medium text-amber-700 mb-2"><strong>Hint:</strong> {ex.hint}</div>}
                                      <MathRenderer content={ex.solution || ex.solution_guide || 'No solution provided.'} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
                          <span>{isCompleted ? 'Mark as Unread' : 'Mark as Completed'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // ── EXAMPLE CARD ───────────────────────────────────────────────
            if (card.type === 'example') {
              const prob = card.originalData;
              const isExpanded = Boolean(expandedCards[`ex-${card.id}`]);
              const isSolRevealed = Boolean(revealedSolutions[card.id]);

              let parsedOptions: string[] = [];
              if (prob.options_json) {
                try { parsedOptions = JSON.parse(prob.options_json); } catch (e) {}
              }

              const statusBadge = prob.status === 'solved'
                ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Solved</span>
                : prob.status === 'surrendered'
                ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200"><XCircle className="w-3.5 h-3.5" /> Missed</span>
                : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200"><HelpCircle className="w-3.5 h-3.5" /> Not Attempted</span>;

              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 hover:border-amber-300 dark:hover:border-amber-700 transition-all space-y-4 ${
                    isDragging ? 'opacity-40 scale-[0.99] border-dashed' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200/60">
                        <Lightbulb className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200/40">EXAMPLE</span>
                      <span className="text-xs font-bold uppercase font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {prob.problem_type.replace('_', ' ')}
                      </span>
                      {statusBadge}
                      <span className="text-xs text-amber-500 font-bold font-mono">Diff {prob.difficulty}/5</span>
                    </div>
                    <button
                      onClick={() => toggleExpand(`ex-${card.id}`)}
                      className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1 flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{isExpanded ? 'Collapse' : 'Work Through'}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
                    <MathRenderer content={card.content} />
                  </div>

                  {/* MCQ Options (neutral, no spoiler) */}
                  {parsedOptions.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parsedOptions.map((opt, oIdx) => (
                        <div key={oIdx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0 font-mono">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <MathRenderer content={opt} />
                        </div>
                      ))}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                      {/* Anti-spoiler solution toggle */}
                      <button
                        type="button"
                        onClick={() => toggleSolution(card.id)}
                        className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          isSolRevealed
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300/60'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSolRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{isSolRevealed ? 'Hide Solution Steps' : 'Reveal Reference Solution'}</span>
                      </button>

                      {isSolRevealed && (
                        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 space-y-2 animate-in fade-in duration-200">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Reference Solution</span>
                          </div>
                          <div className="text-xs text-amber-950 dark:text-amber-200">
                            <MathRenderer content={prob.solution_guide} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // ── EXERCISE CARD ──────────────────────────────────────────────
            if (card.type === 'exercise') {
              const exSet = card.originalData;

              const countLabel = [
                exSet.mcqCount > 0 ? `${exSet.mcqCount} MCQ` : null,
                exSet.essayCount > 0 ? `${exSet.essayCount} Essay` : null,
                exSet.otherCount > 0 ? `${exSet.otherCount} Other` : null,
              ].filter(Boolean).join(' · ') || 'No questions yet';

              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 hover:border-violet-300 dark:hover:border-violet-700 transition-all space-y-4 ${
                    isDragging ? 'opacity-40 scale-[0.99] border-dashed' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="cursor-grab active:cursor-grabbing p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 mt-0.5">
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="p-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 border border-violet-200/60">
                            <Layers className="w-4 h-4" />
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded border border-violet-200/40">EXERCISE</span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {exSet.is_timed ? 'Timed' : 'Untimed'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{exSet.title}</h3>
                        {exSet.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{exSet.description}</p>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/projects/${slug}/outlines/${activeSubchapter.id}/exercise/${exSet.id}`}
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors flex-shrink-0"
                      title="Edit exercise"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Exercise stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-0.5 text-center">
                      <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{exSet.questionCount}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Questions</div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-0.5 text-center col-span-2">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{countLabel}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pass: {exSet.passing_grade}%</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/projects/${slug}/outlines/${activeSubchapter.id}/exercise/${exSet.id}/lobby`}
                    className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-violet-600/30 transition-all m3-ripple"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{exSet.questionCount === 0 ? 'Add Questions to Start' : 'Start Exercise'}</span>
                  </Link>
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
