import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems, exercise_session_attempts, exercise_sets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
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
  searchParams: Promise<{
    title?: string;
    answers?: string;
    // Score params passed by the runner for instant render (before DB write completes)
    score?: string;
    correct?: string;
    total?: string;
    dur?: string;
    timed?: string;
  }>;
}

export default async function ExerciseReviewPage(props: ExerciseReviewPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  // Decode the per-question selected answers forwarded from the session runner
  let selectedAnswers: Record<string, string> | null = null;
  if (searchParams.answers) {
    try {
      selectedAnswers = JSON.parse(
        decodeURIComponent(Buffer.from(searchParams.answers, 'base64').toString('utf8'))
      );
    } catch (e) {
      // Ignore malformed param — review page still works without it
    }
  }

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

  // Fetch exercise set details if available
  const exerciseSet = db
    .select()
    .from(exercise_sets)
    .where(and(eq(exercise_sets.id, params.exerciseId), eq(exercise_sets.is_deleted, 0)))
    .get();

  // Fetch problems attached to this exercise set
  let exerciseProblems = db
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

  if (exerciseProblems.length === 0) {
    exerciseProblems = db
      .select()
      .from(problems)
      .where(and(eq(problems.outline_id, outline.id), eq(problems.is_deleted, 0)))
      .all();
  }

  // Fetch session attempt details from DB
  const dbSessionAttempt = db
    .select()
    .from(exercise_session_attempts)
    .where(and(eq(exercise_session_attempts.id, params.sessionId), eq(exercise_session_attempts.is_deleted, 0)))
    .get();

  if (!selectedAnswers && dbSessionAttempt?.answers_json) {
    try {
      selectedAnswers = JSON.parse(dbSessionAttempt.answers_json);
    } catch (e) {}
  }

  // If the DB record is fully written (has finished_at), use it.
  // Otherwise the runner navigated before the background write completed — build a
  // synthetic record from the URL params the runner encoded for exactly this case.
  const passingGrade = exerciseSet?.passing_grade ?? 70;
  const sessionAttempt = dbSessionAttempt?.finished_at
    ? dbSessionAttempt
    : (() => {
        const urlScore   = parseInt(searchParams.score   ?? '0', 10);
        const urlCorrect = parseInt(searchParams.correct ?? '0', 10);
        const urlTotal   = parseInt(searchParams.total   ?? String(exerciseProblems.length), 10);
        const urlDur     = parseInt(searchParams.dur     ?? '0', 10);
        const urlTimed   = searchParams.timed === '1' ? 1 : 0;
        return {
          id: params.sessionId,
          score_percentage: urlScore,
          is_passed: urlScore >= passingGrade ? 1 : 0,
          correct_answers: urlCorrect,
          total_questions: urlTotal,
          duration_seconds: urlDur,
          attempt_number: dbSessionAttempt?.attempt_number ?? 1,
          is_timed: urlTimed,
          finished_at: Math.floor(Date.now() / 1000),
        };
      })();

  const exerciseTitle =
    searchParams.title || exerciseSet?.title || outline.title || `Exercise Set (${params.exerciseId.substring(0, 8)})`;

  const parentChapter = outline.parent_id
    ? db.select().from(outlines).where(and(eq(outlines.id, outline.parent_id), eq(outlines.is_deleted, 0))).get()
    : null;

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
          parentChapter={parentChapter ? { id: parentChapter.id, code: parentChapter.code, title: parentChapter.title } : null}
          exerciseTitle={exerciseTitle}
          problems={exerciseProblems}
          sessionAttempt={sessionAttempt}
          passingGrade={passingGrade}
          isTimed={Boolean(sessionAttempt?.is_timed)}
          selectedAnswers={selectedAnswers}
        />
      </main>
      <Footer />
    </div>
  );
}
