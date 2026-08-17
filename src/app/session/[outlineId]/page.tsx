import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getSession } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Timer, Sparkles } from 'lucide-react';
import { PracticeSessionRunner } from './PracticeSessionRunner';

export const revalidate = 0;

interface SessionPageProps {
  params: Promise<{ outlineId: string }>;
  searchParams: Promise<{ exerciseId?: string; sessionId?: string; timed?: string }>;
}

export default async function PracticeSessionPage(props: SessionPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const session = await getSession();

  const outline = db.select().from(outlines).where(and(eq(outlines.id, params.outlineId), eq(outlines.is_deleted, 0))).get();
  if (!outline) {
    notFound();
  }

  const project = db.select().from(projects).where(and(eq(projects.id, outline.project_id), eq(projects.is_deleted, 0))).get();
  if (!project) {
    notFound();
  }

  let problemSet = db
    .select()
    .from(problems)
    .where(and(eq(problems.outline_id, outline.id), eq(problems.is_deleted, 0)))
    .all();

  if (searchParams.exerciseId) {
    problemSet = problemSet.filter((p) => p.exercise_id === searchParams.exerciseId || p.id === searchParams.exerciseId);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar username={session?.username || 'admin'} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${project.slug}?sub=${outline.id}`}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                <span>{project.name}</span>
                <span>/</span>
                <span>{outline.code}</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Timed Practice Session: {outline.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Client Practice Session Runner */}
        <PracticeSessionRunner
          outlineId={outline.id}
          slug={project.slug}
          problems={problemSet}
          sessionId={searchParams.sessionId}
        />

      </main>
    </div>
  );
}
