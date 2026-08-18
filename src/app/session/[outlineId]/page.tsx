import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems, exercise_session_attempts } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getCurrentUser } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { PracticeSessionRunner } from './PracticeSessionRunner';
import { checkAndFinalizeExpiredSession, startExerciseSessionAction } from '@/app/actions/exercise';

export const revalidate = 0;

interface SessionPageProps {
  params: Promise<{ outlineId: string }>;
  searchParams: Promise<{
    exerciseId?: string;
    sessionId?: string;
    /** New: 'none' | 'stopwatch' | 'countdown' */
    timerMode?: string;
    /** Countdown total seconds */
    countdown?: string;
    /** Unix timestamp of when the session was created (server-side) */
    startedAt?: string;
    /** Legacy: timed=1 maps to stopwatch */
    timed?: string;
    /** Base64-encoded JSON of pre-loaded answers for resume */
    answers?: string;
  }>;
}

export default async function PracticeSessionPage(props: SessionPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

  const outline = db
    .select()
    .from(outlines)
    .where(and(eq(outlines.id, params.outlineId), eq(outlines.is_deleted, 0)))
    .get();

  if (!outline) notFound();

  const project = db
    .select()
    .from(projects)
    .where(and(eq(projects.id, outline.project_id), eq(projects.is_deleted, 0)))
    .get();

  if (!project) notFound();

  // 1. Find DB session attempt if sessionId passed or active attempt exists
  let dbAttempt: typeof exercise_session_attempts.$inferSelect | undefined;

  if (searchParams.sessionId) {
    dbAttempt = db
      .select()
      .from(exercise_session_attempts)
      .where(
        and(
          eq(exercise_session_attempts.id, searchParams.sessionId),
          eq(exercise_session_attempts.is_deleted, 0)
        )
      )
      .get();
  }

  if (!dbAttempt && searchParams.exerciseId) {
    dbAttempt = db
      .select()
      .from(exercise_session_attempts)
      .where(
        and(
          eq(exercise_session_attempts.exercise_id, searchParams.exerciseId),
          eq(exercise_session_attempts.is_deleted, 0),
          isNull(exercise_session_attempts.finished_at)
        )
      )
      .orderBy(desc(exercise_session_attempts.started_at))
      .get();
  }

  if (!dbAttempt) {
    dbAttempt = db
      .select()
      .from(exercise_session_attempts)
      .where(
        and(
          eq(exercise_session_attempts.outline_id, outline.id),
          eq(exercise_session_attempts.is_deleted, 0),
          isNull(exercise_session_attempts.finished_at)
        )
      )
      .orderBy(desc(exercise_session_attempts.started_at))
      .get();
  }

  // 2. If attempt exists, check if finished or expired
  if (dbAttempt) {
    if (dbAttempt.finished_at !== null) {
      redirect(`/projects/${project.slug}/outlines/${outline.id}/exercise/${dbAttempt.exercise_id}/review/${dbAttempt.id}`);
    }

    const { isExpired, session: finalizedSession } = await checkAndFinalizeExpiredSession(dbAttempt);
    if (isExpired && finalizedSession) {
      redirect(`/projects/${project.slug}/outlines/${outline.id}/exercise/${finalizedSession.exercise_id}/review/${finalizedSession.id}`);
    }
  }

  // 3. Resolve session attributes and timer
  let sessionId = dbAttempt?.id || searchParams.sessionId;
  let targetExerciseId = dbAttempt?.exercise_id || searchParams.exerciseId;

  let timerMode: 'none' | 'stopwatch' | 'countdown' = 'none';
  if (dbAttempt) {
    timerMode = (dbAttempt.timer_mode as 'none' | 'stopwatch' | 'countdown') || 'none';
  } else if (searchParams.timerMode === 'stopwatch' || searchParams.timerMode === 'countdown') {
    timerMode = searchParams.timerMode;
  } else if (searchParams.timed === '1') {
    timerMode = 'stopwatch';
  }

  let countdownSeconds = dbAttempt
    ? dbAttempt.countdown_seconds || 0
    : searchParams.countdown
    ? Math.max(0, parseInt(searchParams.countdown, 10) || 0)
    : 0;

  let startedAt = dbAttempt ? dbAttempt.started_at : searchParams.startedAt ? parseInt(searchParams.startedAt, 10) || null : null;

  // If no DB session was found, create one on server now so it's always tracked on server
  if (!dbAttempt && !sessionId) {
    const exId = targetExerciseId || outline.id;
    const isTimed = timerMode !== 'none';
    const createRes = await startExerciseSessionAction(exId, outline.id, isTimed, timerMode, countdownSeconds);
    if (createRes.success && createRes.sessionId) {
      sessionId = createRes.sessionId;
      startedAt = createRes.startedAt ?? Math.floor(Date.now() / 1000);
      targetExerciseId = exId;
    }
  }

  // 4. Resolve problem set
  let problemSet = db
    .select()
    .from(problems)
    .where(and(eq(problems.outline_id, outline.id), eq(problems.is_deleted, 0)))
    .all();

  if (targetExerciseId) {
    const filtered = problemSet.filter(
      (p) => p.exercise_id === targetExerciseId || p.id === targetExerciseId
    );
    if (filtered.length > 0) {
      problemSet = filtered;
    }
  }

  const parentChapter = outline.parent_id
    ? db.select().from(outlines).where(and(eq(outlines.id, outline.parent_id), eq(outlines.is_deleted, 0))).get()
    : null;

  // 5. Decode answers: priority to DB saved answers, fallback to searchParams
  let initialAnswers: Record<number, string> | undefined;
  if (dbAttempt?.answers_json) {
    try {
      const parsed = JSON.parse(dbAttempt.answers_json);
      if (typeof parsed === 'object' && parsed !== null) {
        initialAnswers = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [Number(k), v as string])
        );
      }
    } catch (e) {}
  }

  if (!initialAnswers && searchParams.answers) {
    try {
      const decoded = decodeURIComponent(atob(searchParams.answers));
      const parsed = JSON.parse(decoded);
      if (typeof parsed === 'object' && parsed !== null) {
        initialAnswers = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [Number(k), v as string])
        );
      }
    } catch (e) {}
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PracticeSessionRunner
          outlineId={outline.id}
          slug={project.slug}
          projectTitle={project.name}
          subchapterCode={outline.code}
          subchapterTitle={outline.title}
          parentChapter={parentChapter ? { id: parentChapter.id, code: parentChapter.code, title: parentChapter.title } : null}
          problems={problemSet}
          sessionId={sessionId}
          exerciseId={targetExerciseId}
          timerMode={timerMode}
          countdownSeconds={countdownSeconds}
          startedAt={startedAt ?? undefined}
          initialAnswers={initialAnswers}
        />
      </main>
      <Footer />
    </div>
  );
}
