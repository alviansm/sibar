import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { PracticeSessionRunner } from './PracticeSessionRunner';

export const revalidate = 0;

interface SessionPageProps {
  params: Promise<{ outlineId: string }>;
  searchParams: Promise<{ exerciseId?: string; sessionId?: string; timed?: string }>;
}

export default async function PracticeSessionPage(props: SessionPageProps) {
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

  let problemSet = db
    .select()
    .from(problems)
    .where(and(eq(problems.outline_id, outline.id), eq(problems.is_deleted, 0)))
    .all();

  if (searchParams.exerciseId) {
    problemSet = problemSet.filter(
      (p) => p.exercise_id === searchParams.exerciseId || p.id === searchParams.exerciseId
    );
  }

  const parentChapter = outline.parent_id
    ? db.select().from(outlines).where(and(eq(outlines.id, outline.parent_id), eq(outlines.is_deleted, 0))).get()
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PracticeSessionRunner
          outlineId={outline.id}
          slug={project.slug}
          projectTitle={project.name}
          subchapterCode={outline.code}
          subchapterTitle={outline.title}
          parentChapter={parentChapter ? { id: parentChapter.id, code: parentChapter.code, title: parentChapter.title } : null}
          problems={problemSet}
          sessionId={searchParams.sessionId}
          exerciseId={searchParams.exerciseId}
          initialIsTimed={searchParams.timed === '1'}
        />
      </main>
    </div>
  );
}
