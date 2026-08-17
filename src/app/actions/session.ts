'use server';

import { db } from '@/db';
import { problem_attempts, problems, outlines, projects } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { cryptoNativeUUID } from '@/lib/utils';
import { generateAttemptFeedback } from '@/lib/gemini';
import { revalidatePath } from 'next/cache';

export async function logAttemptAction(
  problemId: string,
  outlineId: string,
  timeSpentSeconds: number,
  outcome: 'clean_solve' | 'solved_with_hint' | 'surrendered',
  frictionScore: number,
  userNotesOrAnswer: string = ''
) {
  try {
    const prob = db.select().from(problems).where(eq(problems.id, problemId)).get();
    if (!prob) return { error: 'Problem not found' };

    // Get current attempt count for this problem
    const prevAttempts = db
      .select()
      .from(problem_attempts)
      .where(eq(problem_attempts.problem_id, problemId))
      .all();
    
    const attemptNumber = prevAttempts.length + 1;

    // Generate AI Telemetry Feedback
    let aiFeedbackJson = '';
    if (userNotesOrAnswer.trim() || outcome !== 'clean_solve') {
      const feedback = await generateAttemptFeedback(
        prob.problem_statement,
        prob.solution_guide,
        userNotesOrAnswer || `Outcome: ${outcome}`
      );
      aiFeedbackJson = JSON.stringify(feedback);
    }

    const id = cryptoNativeUUID();
    const now = Math.floor(Date.now() / 1000);

    db.insert(problem_attempts)
      .values({
        id,
        problem_id: problemId,
        outline_id: outlineId,
        time_spent_seconds: Math.max(1, timeSpentSeconds),
        attempt_number: attemptNumber,
        outcome,
        friction_score: Math.min(5, Math.max(1, frictionScore)),
        handwritten_file_path: userNotesOrAnswer || null,
        ai_feedback_json: aiFeedbackJson || null,
        created_at: now,
      })
      .run();

    // Automatically update outline status if problem solved cleanly
    const outline = db.select().from(outlines).where(eq(outlines.id, outlineId)).get();
    if (outline) {
      // If currently unvisited, upgrade to in_progress
      if (outline.status === 'unvisited') {
        db.update(outlines)
          .set({ status: 'in_progress' })
          .where(eq(outlines.id, outlineId))
          .run();
      }

      // Check if all problems under this outline have clean solves
      const outlineProbs = db
        .select()
        .from(problems)
        .where(eq(problems.outline_id, outlineId))
        .all();

      const solvedCount = outlineProbs.filter((p) => {
        const attempts = db
          .select()
          .from(problem_attempts)
          .where(
            and(
              eq(problem_attempts.problem_id, p.id),
              eq(problem_attempts.outcome, 'clean_solve')
            )
          )
          .all();
        return attempts.length > 0;
      }).length;

      if (outlineProbs.length > 0 && solvedCount === outlineProbs.length) {
        db.update(outlines)
          .set({ status: 'mastered' })
          .where(eq(outlines.id, outlineId))
          .run();
      }

      const proj = db.select().from(projects).where(eq(projects.id, outline.project_id)).get();
      if (proj) {
        revalidatePath(`/projects/${proj.slug}`);
        revalidatePath('/dashboard');
      }
    }

    return { success: true, attemptId: id, aiFeedback: aiFeedbackJson ? JSON.parse(aiFeedbackJson) : null };
  } catch (err: any) {
    return { error: err.message || 'Failed to log attempt.' };
  }
}
