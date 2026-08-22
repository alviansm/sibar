import React from 'react';
import { db } from '@/db';
import { projects, outlines, problems, problem_attempts, users } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getSession } from '@/lib/auth';
import { formatSecondsToHHMMSS } from '@/lib/utils';
import Link from 'next/link';
import {
  Trophy,
  Timer,
  Target,
  BookOpen,
  Plus,
  ChevronRight,
  Sparkles,
  BarChart2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { NewProjectModal } from './NewProjectModal';
import { ProjectCard } from '@/components/ProjectCard';



import { AiApiChecker } from '@/components/AiApiChecker';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { DashboardQuote } from '@/components/DashboardQuote';
import { getMotivationalQuote } from '@/lib/quotes';
import { getTelemetryOverview } from '@/lib/telemetry';
import { getCurrentUser } from '@/lib/auth';
import { WorkspaceTracker } from '@/components/WorkspaceTracker';
import { DashboardStatsCarousel } from '@/components/DashboardStatsCarousel';
import { StudyIntelligenceCard } from '@/components/StudyIntelligenceCard';

export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const displayName = user?.fullName || user?.username || 'Scholar';

  // Fetch initial motivational quote based on user preference
  const initialQuote = await getMotivationalQuote(
    (user?.quoteRefreshInterval as any) || 'hourly',
    user?.quoteCategory || 'inspirational'
  );

  // Fetch Telemetry Streak Overview
  const telemetryOverview = await getTelemetryOverview(user?.id);

  // Fetch Telemetry Aggregation Data (Only for active non-deleted items)
  const allAttempts = db
    .select({
      id: problem_attempts.id,
      outcome: problem_attempts.outcome,
      time_spent_seconds: problem_attempts.time_spent_seconds,
    })
    .from(problem_attempts)
    .innerJoin(problems, eq(problem_attempts.problem_id, problems.id))
    .innerJoin(outlines, eq(problem_attempts.outline_id, outlines.id))
    .innerJoin(projects, eq(outlines.project_id, projects.id))
    .where(
      and(
        eq(problem_attempts.is_deleted, 0),
        eq(problems.is_deleted, 0),
        eq(outlines.is_deleted, 0),
        eq(projects.is_deleted, 0)
      )
    )
    .all();

  const totalReps = allAttempts.filter((a) => a.outcome === 'clean_solve').length;
  
  const totalSeconds = allAttempts.reduce((acc, curr) => acc + (curr.time_spent_seconds || 0), 0);
  const totalStudyTime = formatSecondsToHHMMSS(totalSeconds);

  const cleanSolveRate = allAttempts.length > 0
    ? Math.round((totalReps / allAttempts.length) * 100)
    : 0;

  // Fetch Projects with Subchapter Progress
  const projectRows = db.select().from(projects).where(eq(projects.is_deleted, 0)).all();

  const projectStats = projectRows.map((proj) => {
    const projOutlines = db
      .select()
      .from(outlines)
      .where(and(eq(outlines.project_id, proj.id), eq(outlines.is_deleted, 0)))
      .all();

    // Subchapters are items with parent_id != null
    const subchapters = projOutlines.filter((o) => o.parent_id !== null);
    const totalSubchapters = subchapters.length;
    const masteredSubchapters = subchapters.filter((s) => s.status === 'mastered').length;
    const progressPct = totalSubchapters > 0
      ? Math.round((masteredSubchapters / totalSubchapters) * 100)
      : 0;

    return {
      ...proj,
      totalSubchapters,
      masteredSubchapters,
      progressPct,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <WorkspaceTracker
        workspaceType="dashboard"
        title="Opened Main Dashboard"
        description="Viewed active study tracks and cognitive telemetry summary."
      />
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cognitive Training Telemetry</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <DashboardQuote
              initialQuote={initialQuote}
              interval={user?.quoteRefreshInterval || 'hourly'}
              category={user?.quoteCategory || 'inspirational'}
            />

          </div>

          <div className="relative z-10 flex items-center gap-3">
            <NewProjectModal />
          </div>
        </div>

        {/* Alternating Telemetry & Streak Carousel */}
        <DashboardStatsCarousel
          totalReps={totalReps}
          totalStudyTime={totalStudyTime}
          cleanSolveRate={cleanSolveRate}
          dayStreak={telemetryOverview.activeStreakDays}
          weekStreak={telemetryOverview.activeStreakWeeks || 0}
          totalActiveDays={telemetryOverview.totalActiveDays}
          isTodayActive={telemetryOverview.isTodayActive}
          dailyStudyTimeTrend={telemetryOverview.dailyStudyTimeTrend}
        />

        {/* Active Projects Grid (Max 9 Cards with My Learning Navigation) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Active Study Projects</h2>
              <span className="text-xs text-slate-500 font-medium ml-1">
                ({Math.min(projectStats.length, 9)} of {projectStats.length})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/my-learning"
                className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>My Learning</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            </div>
          </div>

          {projectStats.length === 0 ? (
            <LottieEmptyState
              title="No active study projects yet"
              message="Create your first self-learning track (e.g. Calculus, Linear Algebra, Quantum Physics) to start logging problem reps."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectStats.slice(0, 9).map((proj) => (
                <ProjectCard
                  key={proj.id}
                  project={{
                    id: proj.id,
                    name: proj.name,
                    slug: proj.slug,
                    category: proj.category || 'General',
                    thumbnail_url: proj.thumbnail_url || null,
                    reference_material: proj.reference_material,
                    target_milestone: proj.target_milestone,
                    status: proj.status,
                    created_at: proj.created_at,
                    last_accessed_at: proj.last_accessed_at || null,
                    totalSubchapters: proj.totalSubchapters,
                    masteredSubchapters: proj.masteredSubchapters,
                    progressPct: proj.progressPct,
                  }}
                />
              ))}
            </div>
          )}

          {projectStats.length > 9 && (
            <div className="pt-2 flex justify-center">
              <Link
                href="/my-learning"
                className="px-6 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center gap-2"
              >
                <span>View all {projectStats.length} workspaces in My Learning</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>


        {/* Study Intelligence AI Component */}
        <StudyIntelligenceCard studentName={displayName} />

        {/* Gemini AI API Connectivity & Model Status Checker (Moved to the bottom) */}
        <AiApiChecker />

      </main>
      <Footer />
    </div>
  );
}
