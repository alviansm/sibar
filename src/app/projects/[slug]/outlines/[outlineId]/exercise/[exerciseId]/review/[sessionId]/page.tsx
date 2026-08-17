import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems, exercise_session_attempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { ExerciseReviewWorkspace } from './ExerciseReviewWorkspace';

export const revalidate = 0;

interface ExerciseReviewPageProps {
  params: Promise<{
    slug: string;
    outlineId: string;
    exerciseId: string;
    sessionId: string;
  }>;
  searchParams: Promise<{ title?: string }>;
}

export default async function ExerciseReviewPage(props: ExerciseReviewPageProps) {
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

  // Fetch session attempt details
  const sessionAttempt = db
    .select()
    .from(exercise_session_attempts)
    .where(and(eq(exercise_session_attempts.id, params.sessionId), eq(exercise_session_attempts.is_deleted, 0)))
    .get();

  const exerciseTitle =
    searchParams.title || `Exercise Set (${params.exerciseId.substring(0, 8)})`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExerciseReviewWorkspace
          outlineId={outline.id}
          exerciseId={params.exerciseId}
          slug={project.slug}
          projectTitle={project.name}
          subchapterCode={outline.code}
          subchapterTitle={outline.title}
          exerciseTitle={exerciseTitle}
          problems={exerciseProblems}
          sessionAttempt={sessionAttempt || null}
        />
      </main>
    </div>
  );
}
