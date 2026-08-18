import React from 'react';
import { db } from '@/db';
import { projects, outlines, problems, problem_attempts, exercise_sets } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  FolderTree,
  Settings,
  Play,
  CheckCircle2,
  HelpCircle,
  XCircle,
  FileCode,
  Plus,
  ChevronRight,
  BookOpen,
  Sparkles,
  Layers,
  Edit3,
  Lightbulb,
} from 'lucide-react';
import { MathRenderer } from '@/components/MathRenderer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { SidebarOutlineTree } from './SidebarOutlineTree';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { SubchapterModulesGrid } from './SubchapterModulesGrid';
import { SubchapterManageDropdown } from './SubchapterManageDropdown';

export const revalidate = 0;

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
}

export default async function ProjectDetailPage(props: ProjectPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  // 1. Fetch Project
  const project = db.select().from(projects).where(and(eq(projects.slug, params.slug), eq(projects.is_deleted, 0))).get();
  if (!project) {
    notFound();
  }

  // 2. Fetch Outlines Tree
  const allOutlines = db
    .select()
    .from(outlines)
    .where(and(eq(outlines.project_id, project.id), eq(outlines.is_deleted, 0)))
    .orderBy(asc(outlines.sort_order))
    .all();

  // Determine active subchapter (Subchapter parent must be an active, non-deleted chapter)
  const chapters = allOutlines.filter((o) => o.parent_id === null || o.parent_id === '');
  const subchapters = allOutlines.filter(
    (o) => o.parent_id !== null && o.parent_id !== '' && chapters.some((c) => c.id === o.parent_id)
  );

  let activeSubchapter = subchapters.find((s) => s.id === searchParams.sub);
  if (!activeSubchapter && subchapters.length > 0) {
    activeSubchapter = subchapters[0];
  }

  const activeParentChapter = activeSubchapter && activeSubchapter.parent_id
    ? chapters.find((c) => c.id === activeSubchapter.parent_id) || null
    : null;

  const breadcrumbs = activeSubchapter
    ? buildBreadcrumbs({
        project: { name: project.name, slug: project.slug },
        chapter: activeParentChapter ? { id: activeParentChapter.id, code: activeParentChapter.code, title: activeParentChapter.title } : null,
        subchapter: { id: activeSubchapter.id, code: activeSubchapter.code, title: activeSubchapter.title },
      })
    : buildBreadcrumbs({ project: { name: project.name, slug: project.slug } });

  const subchaptersWithProgress = subchapters.map((sub) => {
    let conceptsList: any[] = [];
    if (sub.concepts_json) {
      try {
        const parsed = JSON.parse(sub.concepts_json);
        if (Array.isArray(parsed)) conceptsList = parsed.filter((c: any) => !c.is_deleted);
      } catch (e) {}
    }

    const cTotal = conceptsList.length;
    const cCompleted = conceptsList.filter((c) => c.status === 'completed').length;

    const subProbs = db
      .select()
      .from(problems)
      .where(and(eq(problems.outline_id, sub.id), eq(problems.is_deleted, 0)))
      .all();

    const pTotal = subProbs.length;
    let pCompleted = 0;
    for (const p of subProbs) {
      const solved = db
        .select()
        .from(problem_attempts)
        .where(
          and(
            eq(problem_attempts.problem_id, p.id),
            eq(problem_attempts.outcome, 'clean_solve'),
            eq(problem_attempts.is_deleted, 0)
          )
        )
        .get();
      if (solved) pCompleted++;
    }

    const total = cTotal + pTotal;
    const completed = cCompleted + pCompleted;
    const progressPercentage = total > 0 ? (completed / total) * 100 : 0;

    return {
      ...sub,
      totalItems: total,
      completedItems: completed,
      progressPercentage,
    };
  });

  // 3. Fetch Problems (examples only) + Exercise Sets under Active Subchapter
  let activeExamples: any[] = [];
  let activeExerciseSets: any[] = [];

  if (activeSubchapter) {
    const rawProblems = db
      .select()
      .from(problems)
      .where(and(eq(problems.outline_id, activeSubchapter.id), eq(problems.is_deleted, 0)))
      .all();

    // Split: examples are standalone worked problems, exercises belong to a set
    const exampleRaw = rawProblems.filter((p) => p.problem_kind === 'example' || (!p.exercise_id && p.problem_kind !== 'exercise'));
    const exerciseRaw = rawProblems.filter((p) => p.problem_kind === 'exercise' && p.exercise_id);

    activeExamples = exampleRaw.map((prob) => {
      const attempts = db
        .select()
        .from(problem_attempts)
        .where(and(eq(problem_attempts.problem_id, prob.id), eq(problem_attempts.is_deleted, 0)))
        .all();

      let status: 'not_attempted' | 'solved' | 'surrendered' = 'not_attempted';
      const cleanSolve = attempts.find((a) => a.outcome === 'clean_solve');
      const surrendered = attempts.find((a) => a.outcome === 'surrendered');
      if (cleanSolve) status = 'solved';
      else if (surrendered) status = 'surrendered';

      return { ...prob, attemptsCount: attempts.length, status };
    });

    // Fetch exercise_sets for this subchapter with their question counts
    const rawSets = db
      .select()
      .from(exercise_sets)
      .where(and(eq(exercise_sets.outline_id, activeSubchapter.id), eq(exercise_sets.is_deleted, 0)))
      .all();

    // Auto-create exercise_sets for any orphan exercise_id present in exerciseRaw
    const existingSetIds = new Set(rawSets.map((s) => s.id));
    const orphanSetIds = Array.from(
      new Set(exerciseRaw.map((p) => p.exercise_id).filter(Boolean) as string[])
    ).filter((id) => !existingSetIds.has(id));

    if (orphanSetIds.length > 0) {
      const now = Math.floor(Date.now() / 1000);
      for (const orphanId of orphanSetIds) {
        db.insert(exercise_sets)
          .values({
            id: orphanId,
            outline_id: activeSubchapter.id,
            title: 'Textbook Exercise Set',
            description: '',
            passing_grade: 70,
            is_timed: 1,
            created_at: now,
          })
          .run();

        rawSets.push({
          id: orphanId,
          outline_id: activeSubchapter.id,
          title: 'Textbook Exercise Set',
          description: '',
          passing_grade: 70,
          is_timed: 1,
          is_deleted: 0,
          created_at: now,
        });
      }
    }

    activeExerciseSets = rawSets.map((exSet) => {
      const setProblems = exerciseRaw.filter((p) => p.exercise_id === exSet.id);
      const mcqCount = setProblems.filter((p) => p.problem_type === 'multiple_choice').length;
      const essayCount = setProblems.filter((p) => p.problem_type === 'essay').length;
      const otherCount = setProblems.length - mcqCount - essayCount;

      return {
        ...exSet,
        questionCount: setProblems.length,
        mcqCount,
        essayCount,
        otherCount,
      };
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        
        {/* Left Sidebar: Sticky & Independently Scrollable Taxonomy Tree */}
        <aside className="w-full md:w-80 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 flex flex-col justify-between flex-shrink-0 md:sticky md:top-0 md:h-screen md:max-h-screen overflow-hidden">
          
          {/* Project Header Summary (Fixed Top) */}
          <div className="space-y-2 pb-4 border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
              {project.status}
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {project.name}
            </h2>
            <p className="text-xs text-slate-500 line-clamp-2">
              {project.reference_material}
            </p>
          </div>

          {/* Scrollable Taxonomy Tree Container */}
          <div className="flex-1 overflow-y-auto my-4 pr-1.5 space-y-3 custom-scrollbar">
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-20 py-1 border-b border-slate-100 dark:border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5" />
                <span>Syllabus Taxonomy</span>
              </span>
              <Link
                href={`/projects/${project.slug}/settings`}
                title="Edit Taxonomy Tree"
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Link>
            </div>

            <SidebarOutlineTree
              chapters={chapters}
              subchapters={subchaptersWithProgress}
              activeSubId={activeSubchapter?.id}
              slug={project.slug}
            />
          </div>

          {/* Sidebar Footer Link (Fixed Bottom) */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex-shrink-0">
            <Link
              href={`/projects/${project.slug}/settings`}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Project &amp; Outline Settings</span>
            </Link>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 p-6 sm:p-8 space-y-8 overflow-y-auto">
          
          {activeSubchapter ? (
            <>
              {/* Workspace Header & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
                <div className="space-y-1">
                  <Breadcrumb items={breadcrumbs} className="mb-2" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <span>{activeSubchapter.title}</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      activeSubchapter.status === 'mastered'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : activeSubchapter.status === 'in_progress'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {activeSubchapter.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </h1>
                  {activeSubchapter.description && (
                    <div className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl pt-1">
                      <MathRenderer content={activeSubchapter.description} />
                    </div>
                  )}
                </div>

                {/* Right-side Subchapter Management Dropdown */}
                <SubchapterManageDropdown
                  slug={project.slug}
                  outlineId={activeSubchapter.id}
                />
              </div>

              {/* Drag and Drop Modular Grid (Concepts, Examples & Exercises) */}
              <SubchapterModulesGrid
                activeSubchapter={activeSubchapter}
                slug={project.slug}
                activeExamples={activeExamples}
                activeExerciseSets={activeExerciseSets}
              />
            </>
          ) : (
            <LottieEmptyState
              title={subchapters.length === 0 ? 'No Taxonomy Tree Created Yet' : 'No Subchapter Selected'}
              message={
                subchapters.length === 0
                  ? 'This study project does not have any active chapters or subchapters yet. Use Picture to Taxonomy AI or Add Main Chapter in Settings to build your course syllabus.'
                  : 'Select a subchapter from the left outline tree to view problem reps and start practice sessions.'
              }
              actionText={subchapters.length === 0 ? 'Configure Taxonomy in Settings' : undefined}
              actionHref={subchapters.length === 0 ? `/projects/${project.slug}/settings` : undefined}
            />
          )}

        </main>

      </div>
    </div>
  );
}
