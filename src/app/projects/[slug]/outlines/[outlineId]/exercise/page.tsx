import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems, exercise_sets } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { ExerciseManagerWorkspace } from './ExerciseManagerWorkspace';
import { WorkspaceTracker } from '@/components/WorkspaceTracker';

export const revalidate = 0;

interface ExerciseManagerPageProps {
  params: Promise<{ slug: string; outlineId: string }>;
}

export default async function ExerciseManagerPage(props: ExerciseManagerPageProps) {
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

  // Fetch all active exercise_sets for this subchapter
  const rawSets = db
    .select()
    .from(exercise_sets)
    .where(and(eq(exercise_sets.outline_id, outline.id), eq(exercise_sets.is_deleted, 0)))
    .all();

  // Fetch all active exercise problems under this subchapter
  const rawProblems = db
    .select()
    .from(problems)
    .where(
      and(
        eq(problems.outline_id, outline.id),
        eq(problems.problem_kind, 'exercise'),
        eq(problems.is_deleted, 0)
      )
    )
    .all();

  const exerciseSets = rawSets.map((exSet) => {
    const setProblems = rawProblems.filter((p) => p.exercise_id === exSet.id);
    const mcqCount = setProblems.filter((p) => p.problem_type === 'multiple_choice').length;
    const essayCount = setProblems.filter((p) => p.problem_type === 'essay').length;
    const otherCount = setProblems.length - mcqCount - essayCount;

    return {
      id: exSet.id,
      title: exSet.title,
      description: exSet.description,
      passing_grade: exSet.passing_grade,
      is_timed: exSet.is_timed,
      questionCount: setProblems.length,
      mcqCount,
      essayCount,
      otherCount,
    };
  });

  const parentChapter = outline.parent_id
    ? db.select().from(outlines).where(and(eq(outlines.id, outline.parent_id), eq(outlines.is_deleted, 0))).get()
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <WorkspaceTracker
        workspaceType="exercise_workspace"
        title={`Opened Exercise Workspace: [${outline.code}] ${outline.title}`}
        description={`Exercise sets list for ${project.name}`}
        metadata={{
          slug: project.slug,
          outlineId: outline.id,
          subchapterCode: outline.code,
          exerciseSetsCount: exerciseSets.length,
        }}
      />
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ExerciseManagerWorkspace
          outlineId={outline.id}
          slug={project.slug}
          projectTitle={project.name}
          subchapterCode={outline.code}
          subchapterTitle={outline.title}
          parentChapter={parentChapter ? { id: parentChapter.id, code: parentChapter.code, title: parentChapter.title } : null}
          initialExerciseSets={exerciseSets}
        />
      </main>
      <Footer />
    </div>
  );
}
