'use server';

import { db } from '@/db';
import { exercise_session_attempts, exercise_sets } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cryptoNativeUUID } from '@/lib/utils';

export async function startExerciseSessionAction(
  exerciseId: string,
  outlineId: string,
  isTimed: boolean = false
) {
  try {
    const now = Math.floor(Date.now() / 1000);

    // Count previous attempts for this exercise
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
        created_at: now,
      })
      .run();

    return { success: true, sessionId };
  } catch (error: any) {
    console.error('Error in startExerciseSessionAction:', error);
    return { error: error.message || 'Failed to initialize exercise session.' };
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
