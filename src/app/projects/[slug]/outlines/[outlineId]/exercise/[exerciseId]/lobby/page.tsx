import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems, exercise_sets, exercise_session_attempts } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { ExerciseLobbyWorkspace } from './ExerciseLobbyWorkspace';

export const revalidate = 0;

interface ExerciseLobbyPageProps {
  params: Promise<{ slug: string; outlineId: string; exerciseId: string }>;
  searchParams: Promise<{ title?: string }>;
}

export default async function ExerciseLobbyPage(props: ExerciseLobbyPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  const outline = db
    .select()
    .from(outlines)
    .where(and(eq(outlines.id, params.outlineId), eq(outlines.is_deleted, 0)))
    .get();

  if (!outline) {
    notFound();
  }

  const project = db
    .select()
    .from(projects)
    .where(and(eq(projects.id, outline.project_id), eq(projects.is_deleted, 0)))
    .get();

  if (!project) {
    notFound();
  }

  // Fetch problems attached to this exercise set
  const exerciseProblems = db
    .select()
    .from(problems)
    .where(
      and(
        eq(problems.outline_id, outline.id),
        eq(problems.exercise_id, params.exerciseId),
        eq(problems.is_deleted, 0)
      )
    )
    .all();

  // Fetch previous session attempts for metadata & best grade stats
  const previousAttempts = db
    .select()
    .from(exercise_session_attempts)
    .where(
      and(
        eq(exercise_session_attempts.exercise_id, params.exerciseId),
        eq(exercise_session_attempts.is_deleted, 0)
      )
    )
    .orderBy(desc(exercise_session_attempts.started_at))
    .all();

  const attemptsCount = previousAttempts.length;
  const finishedAttempts = previousAttempts.filter((a) => a.finished_at !== null);

  const bestScorePct =
    finishedAttempts.length > 0
      ? Math.max(...finishedAttempts.map((a) => a.score_percentage || 0))
      : null;

  const hasPassed = finishedAttempts.some((a) => a.is_passed === 1);
  const lastAttempt = previousAttempts[0] || null;

  const exerciseTitle =
    searchParams.title || `Exercise Set (${params.exerciseId.substring(0, 8)})`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExerciseLobbyWorkspace
          outlineId={outline.id}
          exerciseId={params.exerciseId}
          slug={project.slug}
          projectTitle={project.name}
          subchapterCode={outline.code}
          subchapterTitle={outline.title}
          exerciseTitle={exerciseTitle}
          questionCount={exerciseProblems.length}
          attemptsCount={attemptsCount}
          bestScorePct={bestScorePct}
          hasPassed={hasPassed}
          passingGrade={70}
          lastAttemptDuration={lastAttempt?.duration_seconds || null}
          lastAttemptFinishedAt={lastAttempt?.finished_at || null}
          lastAttemptSessionId={lastAttempt?.id || null}
        />
      </main>
    </div>
  );
}
