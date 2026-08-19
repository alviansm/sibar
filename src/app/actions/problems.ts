'use server';

import { db } from '@/db';
import { problems, outlines, projects, problem_attempts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cryptoNativeUUID } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/telemetry';

export async function createProblemAction(
  outlineId: string,
  problemStatement: string,
  solutionGuide: string,
  problemType: 'derivation' | 'calculation' | 'multiple_choice' | 'essay',
  options: string[] | null,
  correctOptionIndex: number | null = null,
  difficulty: number = 1,
  correctOptionIndices: number[] | null = null,
  exerciseId: string | null = null,
  problemKind: 'example' | 'exercise' = 'example'
) {
  const id = cryptoNativeUUID();
  const now = Math.floor(Date.now() / 1000);

  try {
    const indicesJson = correctOptionIndices && correctOptionIndices.length > 0
      ? JSON.stringify(correctOptionIndices)
      : correctOptionIndex !== null
      ? JSON.stringify([correctOptionIndex])
      : null;

    db.insert(problems)
      .values({
        id,
        outline_id: outlineId,
        exercise_id: exerciseId,
        problem_kind: problemKind,
        problem_statement: problemStatement,
        solution_guide: solutionGuide,
        problem_type: problemType,
        options_json: options ? JSON.stringify(options) : null,
        correct_option_index: correctOptionIndex,
        correct_option_indices: indicesJson,
        difficulty: Math.min(5, Math.max(1, difficulty)),
        created_at: now,
      })
      .run();

    const outline = db.select().from(outlines).where(eq(outlines.id, outlineId)).get();
    if (outline) {
      const proj = db.select().from(projects).where(eq(projects.id, outline.project_id)).get();
      if (proj) {
        revalidatePath(`/projects/${proj.slug}/outlines/${outlineId}`);
        revalidatePath(`/projects/${proj.slug}`);

        await logActivity({
          activityType: 'problem_create',
          category: 'problem',
          title: `Created ${problemKind === 'exercise' ? 'Exercise Problem' : 'Worked Example'}: [${outline.code}]`,
          description: `Type: ${problemType} | Difficulty: ${difficulty}/5`,
          metadata: {
            problemId: id,
            outlineId,
            problemKind,
            problemType,
            difficulty,
            exerciseId,
            projectSlug: proj.slug,
          },
        });
      }
    }

    return { success: true, id };
  } catch (err: any) {
    return { error: err.message || 'Failed to create problem.' };
  }
}

export async function updateProblemAction(
  id: string,
  problemStatement: string,
  solutionGuide: string,
  problemType: 'derivation' | 'calculation' | 'multiple_choice' | 'essay',
  options: string[] | null,
  correctOptionIndex: number | null = null,
  difficulty: number = 1,
  correctOptionIndices: number[] | null = null
) {
  try {
    const prob = db.select().from(problems).where(eq(problems.id, id)).get();
    if (!prob) return { error: 'Problem not found.' };

    const indicesJson = correctOptionIndices && correctOptionIndices.length > 0
      ? JSON.stringify(correctOptionIndices)
      : correctOptionIndex !== null
      ? JSON.stringify([correctOptionIndex])
      : null;

    db.update(problems)
      .set({
        problem_statement: problemStatement,
        solution_guide: solutionGuide,
        problem_type: problemType,
        options_json: options ? JSON.stringify(options) : null,
        correct_option_index: correctOptionIndex,
        correct_option_indices: indicesJson,
        difficulty: Math.min(5, Math.max(1, difficulty)),
      })
      .where(eq(problems.id, id))
      .run();

    const outline = db.select().from(outlines).where(eq(outlines.id, prob.outline_id)).get();
    if (outline) {
      const proj = db.select().from(projects).where(eq(projects.id, outline.project_id)).get();
      if (proj) {
        revalidatePath(`/projects/${proj.slug}/outlines/${prob.outline_id}`);
        revalidatePath(`/projects/${proj.slug}`);

        await logActivity({
          activityType: 'problem_update',
          category: 'problem',
          title: `Updated Problem in [${outline.code}]`,
          description: `Type: ${problemType} | Difficulty: ${difficulty}/5`,
          metadata: { problemId: id, outlineId: prob.outline_id, projectSlug: proj.slug },
        });
      }
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update problem.' };
  }
}

export async function deleteProblemAction(id: string) {
  try {
    const prob = db.select().from(problems).where(eq(problems.id, id)).get();
    if (!prob) return { error: 'Problem not found.' };

    db.update(problems).set({ is_deleted: 1 }).where(eq(problems.id, id)).run();
    db.update(problem_attempts).set({ is_deleted: 1 }).where(eq(problem_attempts.problem_id, id)).run();

    const outline = db.select().from(outlines).where(eq(outlines.id, prob.outline_id)).get();
    if (outline) {
      const proj = db.select().from(projects).where(eq(projects.id, outline.project_id)).get();
      if (proj) {
        revalidatePath(`/projects/${proj.slug}/outlines/${prob.outline_id}`);
        revalidatePath(`/projects/${proj.slug}`);

        await logActivity({
          activityType: 'problem_delete',
          category: 'problem',
          title: `Deleted Problem from [${outline.code}]`,
          metadata: { problemId: id, outlineId: prob.outline_id, projectSlug: proj.slug },
        });
      }
    }

    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete problem.' };
  }
}

export async function importProblemSetListAction(
  outlineId: string,
  problemsData: any[],
  exerciseId: string | null = null,
  problemKind: 'example' | 'exercise' = 'example'
) {
  const now = Math.floor(Date.now() / 1000);
  try {
    const outline = db.select().from(outlines).where(eq(outlines.id, outlineId)).get();
    if (!outline) return { error: 'Subchapter not found.' };

    let count = 0;
    for (const p of problemsData) {
      const pId = cryptoNativeUUID();

      let indicesJson = null;
      if (Array.isArray(p.correct_option_indices)) {
        indicesJson = JSON.stringify(p.correct_option_indices);
      } else if (typeof p.correct_option_index === 'number') {
        indicesJson = JSON.stringify([p.correct_option_index]);
      }

      db.insert(problems)
        .values({
          id: pId,
          outline_id: outlineId,
          exercise_id: exerciseId,
          problem_kind: problemKind,
          problem_statement: p.problem_statement || 'Exercise problem',
          solution_guide: p.solution_guide || 'Reference solution',
          problem_type: p.problem_type || 'calculation',
          options_json: Array.isArray(p.options) ? JSON.stringify(p.options) : null,
          correct_option_index: typeof p.correct_option_index === 'number' ? p.correct_option_index : (Array.isArray(p.correct_option_indices) && p.correct_option_indices.length > 0 ? p.correct_option_indices[0] : null),
          correct_option_indices: indicesJson,
          difficulty: typeof p.difficulty === 'number' ? p.difficulty : 2,
          created_at: now,
        })
        .run();
      count++;
    }

    const proj = db.select().from(projects).where(eq(projects.id, outline.project_id)).get();
    if (proj) {
      revalidatePath(`/projects/${proj.slug}/outlines/${outlineId}`);
      revalidatePath(`/projects/${proj.slug}`);

      await logActivity({
        activityType: 'problem_import',
        category: 'problem',
        title: `Imported ${count} Problems into [${outline.code}]`,
        description: `Kind: ${problemKind} in ${proj.name}`,
        metadata: { outlineId, count, problemKind, exerciseId, projectSlug: proj.slug },
      });
    }

    revalidatePath('/dashboard');
    return { success: true, count };
  } catch (err: any) {
    return { error: err.message || 'Failed to import problem set list.' };
  }
}

export async function toggleExampleStatusAction(outlineId: string, problemId: string) {
  try {
    const existing = db
      .select()
      .from(problem_attempts)
      .where(
        and(
          eq(problem_attempts.problem_id, problemId),
          eq(problem_attempts.outcome, 'clean_solve'),
          eq(problem_attempts.is_deleted, 0)
        )
      )
      .get();

    const isNowCompleted = !existing;

    if (existing) {
      db.update(problem_attempts)
        .set({ is_deleted: 1 })
        .where(eq(problem_attempts.id, existing.id))
        .run();
    } else {
      const now = Math.floor(Date.now() / 1000);
      const id = cryptoNativeUUID();
      db.insert(problem_attempts)
        .values({
          id,
          problem_id: problemId,
          outline_id: outlineId,
          time_spent_seconds: 0,
          attempt_number: 1,
          outcome: 'clean_solve',
          friction_score: 1,
          created_at: now,
        })
        .run();
    }

    const outline = db.select().from(outlines).where(eq(outlines.id, outlineId)).get();
    if (outline) {
      const proj = db.select().from(projects).where(eq(projects.id, outline.project_id)).get();
      if (proj) {
        revalidatePath(`/projects/${proj.slug}`);

        await logActivity({
          activityType: isNowCompleted ? 'example_complete' : 'example_uncomplete',
          category: 'problem',
          title: `${isNowCompleted ? 'Completed' : 'Uncompleted'} Worked Example in [${outline.code}]`,
          description: `Subchapter: ${outline.title} in ${proj.name}`,
          metadata: {
            outlineId,
            problemId,
            status: isNowCompleted ? 'completed' : 'uncompleted',
            projectSlug: proj.slug,
          },
        });
      }
    }

    return { success: true, isCompleted: isNowCompleted };
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle example status.' };
  }
}

