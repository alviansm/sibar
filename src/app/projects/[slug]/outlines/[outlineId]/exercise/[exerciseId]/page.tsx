import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems, exercise_sets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { ExerciseEditorWorkspace } from './ExerciseEditorWorkspace';

export const revalidate = 0;

interface ExercisePageProps {
  params: Promise<{ slug: string; outlineId: string; exerciseId: string }>;
}

export default async function DedicatedExercisePage(props: ExercisePageProps) {
  const params = await props.params;
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

  // Fetch the exercise_set row for metadata
  let exerciseSet = db
    .select()
    .from(exercise_sets)
    .where(and(eq(exercise_sets.id, params.exerciseId), eq(exercise_sets.is_deleted, 0)))
    .get();

  if (!exerciseSet) {
    const existingProb = db
      .select()
      .from(problems)
      .where(and(eq(problems.exercise_id, params.exerciseId), eq(problems.is_deleted, 0)))
      .get();

    if (existingProb) {
      const now = Math.floor(Date.now() / 1000);
      db.insert(exercise_sets)
        .values({
          id: params.exerciseId,
          outline_id: outline.id,
          title: 'Textbook Exercise Set',
          description: '',
          passing_grade: 70,
          is_timed: 1,
          created_at: now,
        })
        .run();

      exerciseSet = {
        id: params.exerciseId,
        outline_id: outline.id,
        title: 'Textbook Exercise Set',
        description: '',
        passing_grade: 70,
        is_timed: 1,
        is_deleted: 0,
        created_at: now,
      };
    } else {
      notFound();
    }
  }

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

  const parentChapter = outline.parent_id
    ? db.select().from(outlines).where(and(eq(outlines.id, outline.parent_id), eq(outlines.is_deleted, 0))).get()
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ExerciseEditorWorkspace
          outlineId={outline.id}
          exerciseId={params.exerciseId}
          slug={project.slug}
          projectTitle={project.name}
          subchapterCode={outline.code}
          subchapterTitle={outline.title}
          parentChapter={parentChapter ? { id: parentChapter.id, code: parentChapter.code, title: parentChapter.title } : null}
          exerciseTitle={exerciseSet.title}
          exerciseDescription={exerciseSet.description}
          passingGrade={exerciseSet.passing_grade}
          isTimed={exerciseSet.is_timed === 1}
          initialProblems={exerciseProblems}
        />
      </main>
    </div>
  );
}
