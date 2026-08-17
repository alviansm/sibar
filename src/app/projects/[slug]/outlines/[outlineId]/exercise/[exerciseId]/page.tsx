import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { ExerciseEditorWorkspace } from './ExerciseEditorWorkspace';

export const revalidate = 0;

interface ExercisePageProps {
  params: Promise<{ slug: string; outlineId: string; exerciseId: string }>;
  searchParams: Promise<{ title?: string }>;
}

export default async function DedicatedExercisePage(props: ExercisePageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();

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

  const exerciseTitle = searchParams.title || `Exercise Set (${params.exerciseId.substring(0, 8)})`;

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
          exerciseTitle={exerciseTitle}
          initialProblems={exerciseProblems}
        />
      </main>
    </div>
  );
}
