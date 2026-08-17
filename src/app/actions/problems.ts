'use server';

import { db } from '@/db';
import { problems, outlines, projects, problem_attempts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cryptoNativeUUID } from '@/lib/utils';
import { revalidatePath } from 'next/cache';

export async function createProblemAction(
  outlineId: string,
  problemStatement: string,
  solutionGuide: string,
  problemType: 'derivation' | 'calculation' | 'multiple_choice' | 'essay',
  options: string[] | null,
  correctOptionIndex: number | null = null,
  difficulty: number = 1,
  correctOptionIndices: number[] | null = null,
  exerciseId: string | null = null
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
  exerciseId: string | null = null
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
    }

    revalidatePath('/dashboard');
    return { success: true, count };
  } catch (err: any) {
    return { error: err.message || 'Failed to import problem set list.' };
  }
}
