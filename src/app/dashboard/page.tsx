import React from 'react';
import { db } from '@/db';
import { projects, outlines, problems, problem_attempts, users } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
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
  Clock,
  Layers,
} from 'lucide-react';
import { NewProjectModal } from './NewProjectModal';

import { AiApiChecker } from '@/components/AiApiChecker';
import { LottieEmptyState } from '@/components/LottieEmptyState';
import { DashboardQuote } from '@/components/DashboardQuote';
import { getMotivationalQuote } from '@/lib/quotes';

import { getCurrentUser } from '@/lib/auth';

export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const displayName = user?.fullName || user?.username || 'Scholar';

  // Fetch initial motivational quote based on user preference
  const initialQuote = await getMotivationalQuote(
    (user?.quoteRefreshInterval as any) || 'hourly',
    user?.quoteCategory || 'inspirational'
  );


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

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Card 1: Solved Reps */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800 flex-shrink-0">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Solved Reps</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {totalReps} <span className="text-xs font-normal text-slate-500">reps</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Clean derivations &amp; solutions</span>
              </p>
            </div>
          </div>

          {/* Card 2: Study Hours */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-800 flex-shrink-0">
              <Timer className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Study Time</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 font-mono">
                {totalStudyTime}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                <span>Logged practice stopwatch</span>
              </p>
            </div>
          </div>

          {/* Card 3: Clean Solve Rate */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800 flex-shrink-0">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clean Solve Rate</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                {cleanSolveRate}%
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>First-attempt solve ratio</span>
              </p>
            </div>
          </div>

        </div>

        {/* Gemini AI API Connectivity & Model Status Checker */}
        <AiApiChecker />

        {/* Active Projects Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Active Study Projects</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">{projectStats.length} Tracks Configured</span>
          </div>

          {projectStats.length === 0 ? (
            <LottieEmptyState
              title="No active study projects yet"
              message="Create your first self-learning track (e.g. Calculus, Linear Algebra, Quantum Physics) to start logging problem reps."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectStats.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-m3-1 hover:shadow-m3-3 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    
                    {/* Badge & Title */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-2 border border-slate-200 dark:border-slate-700">
                          {proj.status}
                        </span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {proj.name}
                        </h3>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-200/60 dark:border-indigo-800">
                        {proj.progressPct}%
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <p className="line-clamp-1 font-medium">
                        <span className="text-slate-400 font-normal">Reference: </span>
                        {proj.reference_material}
                      </p>
                      <p className="line-clamp-1 font-medium text-indigo-600 dark:text-indigo-300">
                        <span className="text-slate-400 font-normal">Milestone: </span>
                        {proj.target_milestone}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Subchapter Mastery</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {proj.masteredSubchapters} / {proj.totalSubchapters} Mastered
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${proj.progressPct}%` }}
                        ></div>
                      </div>
                    </div>

                  </div>

                  {/* Card Action Link */}
                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <Link
                      href={`/projects/${proj.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                      <span>Open Workspace</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/projects/${proj.slug}/settings`}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Taxonomy Settings
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
