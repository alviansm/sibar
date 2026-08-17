import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { ExampleManagerWorkspace } from './ExampleManagerWorkspace';

export const revalidate = 0;

interface ExamplesPageProps {
  params: Promise<{ slug: string; outlineId: string }>;
}

export default async function ExamplesPage(props: ExamplesPageProps) {
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

  // Fetch only Example problems (problem_kind = 'example') under this subchapter
  const rawProblems = db
    .select()
    .from(problems)
    .where(and(eq(problems.outline_id, outline.id), eq(problems.is_deleted, 0)))
    .all();

  const exampleProblems = rawProblems.filter(
    (p) => p.problem_kind === 'example' || (!p.exercise_id && p.problem_kind !== 'exercise')
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ExampleManagerWorkspace
          outlineId={outline.id}
          slug={project.slug}
          projectTitle={project.name}
          subchapterCode={outline.code}
          subchapterTitle={outline.title}
          initialExamples={exampleProblems}
        />
      </main>
    </div>
  );
}
