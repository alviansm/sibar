'use server';

import { db } from '@/db';
import { exercise_session_attempts, exercise_sets, problems, outlines, projects } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cryptoNativeUUID } from '@/lib/utils';
import { logActivity } from '@/lib/telemetry';

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

        await logActivity({
          activityType: 'exercise_create',
          category: 'exercise',
          title: `Created Exercise Set: ${title}`,
          description: `Passing grade: ${passingGrade}% in [${outline.code}] ${outline.title}`,
          metadata: { exerciseId: id, outlineId, title, passingGrade, projectSlug: proj.slug },
        });
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

    const exSet = db.select().from(exercise_sets).where(eq(exercise_sets.id, exerciseId)).get();
    const outline = db.select().from(outlines).where(eq(outlines.id, outlineId)).get();

    await logActivity({
      activityType: 'exercise_session_start',
      category: 'exercise',
      title: `Started Exercise: ${exSet?.title || 'Practice Set'}`,
      description: `Timer Mode: ${timerMode}${countdownSeconds ? ` (${Math.round(countdownSeconds / 60)} min)` : ''} | Attempt #${attemptNumber}`,
      metadata: {
        sessionId,
        exerciseId,
        outlineId,
        attemptNumber,
        timerMode,
        isTimed,
        subchapterCode: outline?.code,
      },
    });

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

export async function abandonExerciseSessionAction(sessionId: string) {
  try {
    db.update(exercise_session_attempts)
      .set({ is_deleted: 1 })
      .where(eq(exercise_session_attempts.id, sessionId))
      .run();

    await logActivity({
      activityType: 'exercise_session_abandon',
      category: 'exercise',
      title: 'Abandoned Exercise Session',
      metadata: { sessionId },
    });

    revalidatePath('/projects/[slug]', 'layout');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to abandon exercise session.' };
  }
}

export async function checkAndFinalizeExpiredSession(sessionAttempt: typeof exercise_session_attempts.$inferSelect) {
  if (
    !sessionAttempt ||
    sessionAttempt.finished_at !== null ||
    sessionAttempt.timer_mode !== 'countdown' ||
    !sessionAttempt.countdown_seconds
  ) {
    return { isExpired: false, session: sessionAttempt };
  }

  const now = Math.floor(Date.now() / 1000);
  const expirationTime = sessionAttempt.started_at + sessionAttempt.countdown_seconds;

  if (now < expirationTime) {
    return { isExpired: false, session: sessionAttempt };
  }

  // Session has expired! Auto-finalize and grade
  try {
    // 1. Fetch problems for this exercise / outline
    let exerciseProblems = db
      .select()
      .from(problems)
      .where(
        and(
          eq(problems.outline_id, sessionAttempt.outline_id),
          eq(problems.exercise_id, sessionAttempt.exercise_id),
          eq(problems.is_deleted, 0)
        )
      )
      .all();

    if (exerciseProblems.length === 0) {
      exerciseProblems = db
        .select()
        .from(problems)
        .where(
          and(
            eq(problems.outline_id, sessionAttempt.outline_id),
            eq(problems.is_deleted, 0)
          )
        )
        .all();
    }

    // 2. Parse saved answers
    let answersMap: Record<number, string> = {};
    if (sessionAttempt.answers_json) {
      try {
        answersMap = JSON.parse(sessionAttempt.answers_json);
      } catch (e) {}
    }

    // 3. Grade MCQ questions
    let correctCount = 0;
    const totalCount = exerciseProblems.length;

    exerciseProblems.forEach((prob, i) => {
      const selected = answersMap[i];
      let isMcqCorrect = false;
      if (prob.problem_type === 'multiple_choice' && selected) {
        let parsedOpts: string[] = [];
        if (prob.options_json) {
          try { parsedOpts = JSON.parse(prob.options_json); } catch (e) {}
        }
        let correctIndices: number[] = [];
        if (prob.correct_option_indices) {
          try { correctIndices = JSON.parse(prob.correct_option_indices); } catch (e) {}
        } else if (typeof prob.correct_option_index === 'number') {
          correctIndices = [prob.correct_option_index];
        }
        const chosenIndex = parsedOpts.indexOf(selected);
        if (correctIndices.length > 0 && chosenIndex !== -1) {
          isMcqCorrect = correctIndices.includes(chosenIndex);
        }
      }
      if (isMcqCorrect) {
        correctCount++;
      }
    });

    // 4. Determine passing grade
    const exSet = db
      .select()
      .from(exercise_sets)
      .where(and(eq(exercise_sets.id, sessionAttempt.exercise_id), eq(exercise_sets.is_deleted, 0)))
      .get();
    const passingGrade = exSet?.passing_grade ?? 70;
    const scorePct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const isPassed = scorePct >= passingGrade ? 1 : 0;
    const finalDuration = sessionAttempt.countdown_seconds;

    // 5. Update session attempt
    db.update(exercise_session_attempts)
      .set({
        finished_at: expirationTime,
        duration_seconds: finalDuration,
        total_questions: totalCount,
        correct_answers: correctCount,
        score_percentage: scorePct,
        is_passed: isPassed,
        last_saved_at: now,
      })
      .where(eq(exercise_session_attempts.id, sessionAttempt.id))
      .run();

    const finalizedSession = {
      ...sessionAttempt,
      finished_at: expirationTime,
      duration_seconds: finalDuration,
      total_questions: totalCount,
      correct_answers: correctCount,
      score_percentage: scorePct,
      is_passed: isPassed,
      last_saved_at: now,
    };

    return { isExpired: true, session: finalizedSession };
  } catch (error) {
    console.error('Error auto-finalizing expired session:', error);
    return { isExpired: false, session: sessionAttempt };
  }
}

export async function finishExerciseSessionAction(
  sessionId: string,
  correctAnswers: number,
  totalQuestions: number,
  durationSeconds: number,
  passingGrade: number = 70,
  answersJson?: string
) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const scorePct = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const isPassed = scorePct >= passingGrade ? 1 : 0;

    const updateData: any = {
      finished_at: now,
      duration_seconds: durationSeconds,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      score_percentage: scorePct,
      is_passed: isPassed,
      last_saved_at: now,
    };

    if (answersJson !== undefined) {
      updateData.answers_json = answersJson;
    }

    db.update(exercise_session_attempts)
      .set(updateData)
      .where(eq(exercise_session_attempts.id, sessionId))
      .run();

    const sess = db.select().from(exercise_session_attempts).where(eq(exercise_session_attempts.id, sessionId)).get();
    let exTitle = 'Exercise Set';
    if (sess) {
      const exSet = db.select().from(exercise_sets).where(eq(exercise_sets.id, sess.exercise_id)).get();
      if (exSet) exTitle = exSet.title;
    }

    await logActivity({
      activityType: 'exercise_session_finish',
      category: 'exercise',
      title: `Completed Exercise: ${exTitle} (${scorePct}%)`,
      description: `${isPassed ? 'Passed' : 'Needs Practice'} | Score: ${correctAnswers}/${totalQuestions} (${scorePct}%) | Time: ${Math.round(durationSeconds / 60)} min`,
      metadata: {
        sessionId,
        scorePct,
        isPassed: Boolean(isPassed),
        correctAnswers,
        totalQuestions,
        durationSeconds,
        passingGrade,
      },
    });

    revalidatePath('/projects/[slug]', 'layout');
    return { success: true, scorePct, isPassed };
  } catch (error: any) {
    console.error('Error in finishExerciseSessionAction:', error);
    return { error: error.message || 'Failed to complete exercise session record.' };
  }
}
