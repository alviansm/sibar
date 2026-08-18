'use server';

import { db } from '@/db';
import { exercise_session_attempts, exercise_sets, problems, outlines, projects } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cryptoNativeUUID } from '@/lib/utils';

// ─── Exercise Set CRUD ────────────────────────────────────────────────────────

export async function createExerciseSetAction(
  outlineId: string,
  title: string,
  description: string = '',
  passingGrade: number = 70,
  isTimed: boolean = true
) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const id = cryptoNativeUUID();

    db.insert(exercise_sets)
      .values({ id, outline_id: outlineId, title, description, passing_grade: passingGrade, is_timed: isTimed ? 1 : 0, created_at: now })
      .run();

    const outline = db.select().from(outlines).where(eq(outlines.id, outlineId)).get();
    if (outline) {
      const proj = db.select().from(projects).where(eq(projects.id, outline.project_id)).get();
      if (proj) {
        revalidatePath(`/projects/${proj.slug}`);
      }
    }

    return { success: true, id };
  } catch (error: any) {
    return { error: error.message || 'Failed to create exercise set.' };
  }
}

export async function updateExerciseSetAction(
  exerciseId: string,
  updates: {
    title?: string;
    description?: string;
    passing_grade?: number;
    is_timed?: boolean;
  }
) {
  try {
    const setObj: any = {};
    if (updates.title !== undefined) setObj.title = updates.title;
    if (updates.description !== undefined) setObj.description = updates.description;
    if (updates.passing_grade !== undefined) setObj.passing_grade = Math.max(0, Math.min(100, updates.passing_grade));
    if (updates.is_timed !== undefined) setObj.is_timed = updates.is_timed ? 1 : 0;

    db.update(exercise_sets).set(setObj).where(eq(exercise_sets.id, exerciseId)).run();

    revalidatePath('/projects/[slug]', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update exercise set.' };
  }
}

export async function deleteExerciseSetAction(exerciseId: string) {
  try {
    // Soft-delete the exercise set
    db.update(exercise_sets).set({ is_deleted: 1 }).where(eq(exercise_sets.id, exerciseId)).run();
    // Soft-delete all associated problems
    db.update(problems).set({ is_deleted: 1 }).where(eq(problems.exercise_id, exerciseId)).run();

    revalidatePath('/projects/[slug]', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete exercise set.' };
  }
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function startExerciseSessionAction(
  exerciseId: string,
  outlineId: string,
  isTimed: boolean = false,
  timerMode: 'none' | 'stopwatch' | 'countdown' = 'none',
  countdownSeconds: number = 0
) {
  try {
    const now = Math.floor(Date.now() / 1000);

    const previousAttempts = db
      .select()
      .from(exercise_session_attempts)
      .where(
        and(
          eq(exercise_session_attempts.exercise_id, exerciseId),
          eq(exercise_session_attempts.is_deleted, 0)
        )
      )
      .all();

    const attemptNumber = previousAttempts.length + 1;
    const sessionId = cryptoNativeUUID();

    db.insert(exercise_session_attempts)
      .values({
        id: sessionId,
        exercise_id: exerciseId,
        outline_id: outlineId,
        started_at: now,
        finished_at: null,
        duration_seconds: 0,
        total_questions: 0,
        correct_answers: 0,
        score_percentage: 0,
        is_passed: 0,
        attempt_number: attemptNumber,
        is_timed: isTimed ? 1 : 0,
        timer_mode: timerMode,
        countdown_seconds: countdownSeconds,
        answers_json: null,
        last_saved_at: null,
        created_at: now,
      })
      .run();

    return { success: true, sessionId, startedAt: now };
  } catch (error: any) {
    console.error('Error in startExerciseSessionAction:', error);
    return { error: error.message || 'Failed to initialize exercise session.' };
  }
}

export async function saveSessionProgressAction(
  sessionId: string,
  answersJson: string
) {
  try {
    const now = Math.floor(Date.now() / 1000);
    db.update(exercise_session_attempts)
      .set({ answers_json: answersJson, last_saved_at: now })
      .where(and(eq(exercise_session_attempts.id, sessionId), eq(exercise_session_attempts.is_deleted, 0)))
      .run();
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to save session progress.' };
  }
}

export async function finishExerciseSessionAction(
  sessionId: string,
  correctAnswers: number,
  totalQuestions: number,
  durationSeconds: number,
  passingGrade: number = 70
) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const scorePct = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const isPassed = scorePct >= passingGrade ? 1 : 0;

    db.update(exercise_session_attempts)
      .set({
        finished_at: now,
        duration_seconds: durationSeconds,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        score_percentage: scorePct,
        is_passed: isPassed,
        // Clear saved draft answers on finish
        answers_json: null,
        last_saved_at: null,
      })
      .where(eq(exercise_session_attempts.id, sessionId))
      .run();

    revalidatePath('/projects/[slug]', 'layout');
    return { success: true, scorePct, isPassed };
  } catch (error: any) {
    console.error('Error in finishExerciseSessionAction:', error);
    return { error: error.message || 'Failed to complete exercise session record.' };
  }
}
