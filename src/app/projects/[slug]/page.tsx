import React from 'react';
import { db } from '@/db';
import { projects, outlines, problems, problem_attempts, exercise_sets, exercise_session_attempts } from '@/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
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
import { ProjectSidebar } from './ProjectSidebar';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { SubchapterModulesGrid } from './SubchapterModulesGrid';
import { SubchapterManageDropdown } from './SubchapterManageDropdown';
import { checkAndFinalizeExpiredSession } from '@/app/actions/exercise';
import { WorkspaceTracker } from '@/components/WorkspaceTracker';

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

  // Update last_accessed_at for Last Opened sorting
  try {
    db.update(projects)
      .set({ last_accessed_at: Math.floor(Date.now() / 1000) })
      .where(eq(projects.id, project.id))
      .run();
  } catch (e) {}


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

    activeExerciseSets = await Promise.all(
      rawSets.map(async (exSet) => {
        const setProblems = exerciseRaw.filter((p) => p.exercise_id === exSet.id);
        const mcqCount = setProblems.filter((p) => p.problem_type === 'multiple_choice').length;
        const essayCount = setProblems.filter((p) => p.problem_type === 'essay').length;
        const otherCount = setProblems.length - mcqCount - essayCount;

        // Detect in-progress session: most recent attempt
        let latestAttempt = db
          .select()
          .from(exercise_session_attempts)
          .where(
            and(
              eq(exercise_session_attempts.exercise_id, exSet.id),
              eq(exercise_session_attempts.is_deleted, 0)
            )
          )
          .orderBy(desc(exercise_session_attempts.started_at))
          .get();

        if (latestAttempt && latestAttempt.finished_at === null) {
          const { isExpired, session: finalAttempt } = await checkAndFinalizeExpiredSession(latestAttempt);
          if (isExpired && finalAttempt) {
            latestAttempt = finalAttempt;
          }
        }

        const inProgressSession =
          latestAttempt && latestAttempt.finished_at === null
            ? {
                sessionId: latestAttempt.id,
                startedAt: latestAttempt.started_at,
                timerMode: (latestAttempt.timer_mode as 'none' | 'stopwatch' | 'countdown') || 'none',
                countdownSeconds: latestAttempt.countdown_seconds || 0,
                answersJson: latestAttempt.answers_json ?? null,
              }
            : null;

        return {
          ...exSet,
          questionCount: setProblems.length,
          mcqCount,
          essayCount,
          otherCount,
          inProgressSession,
        };
      })
    );
  }

  const wsTitle = activeSubchapter
    ? `Opened Subchapter: [${activeSubchapter.code}] ${activeSubchapter.title}`
    : `Opened Project: ${project.name}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <WorkspaceTracker
        workspaceType="project_workspace"
        title={wsTitle}
        description={`Study track: ${project.name}`}
        metadata={{
          slug: project.slug,
          projectId: project.id,
          outlineId: activeSubchapter?.id,
          subchapterCode: activeSubchapter?.code,
          subchapterTitle: activeSubchapter?.title,
        }}
      />
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        
        {/* Left Sidebar: Collapsible on Mobile, Sticky on Desktop */}
        <ProjectSidebar
          project={project}
          chapters={chapters}
          subchapters={subchaptersWithProgress}
          activeSubId={activeSubchapter?.id}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 overflow-y-auto min-w-0">
          
          {activeSubchapter ? (
            <>
              {/* Workspace Header & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <Breadcrumb items={breadcrumbs} className="mb-2" />
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight break-words">
                      {activeSubchapter.title}
                    </h1>
                    <span className={`text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-semibold flex-shrink-0 ${
                      activeSubchapter.status === 'mastered'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : activeSubchapter.status === 'in_progress'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {activeSubchapter.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {activeSubchapter.description && (
                    <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl pt-1 overflow-x-auto">
                      <MathRenderer content={activeSubchapter.description} />
                    </div>
                  )}
                </div>

                {/* Right-side Subchapter Management Dropdown */}
                <div className="self-start sm:self-auto">
                  <SubchapterManageDropdown
                    slug={project.slug}
                    outlineId={activeSubchapter.id}
                  />
                </div>
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
      <Footer />
    </div>
  );
}
