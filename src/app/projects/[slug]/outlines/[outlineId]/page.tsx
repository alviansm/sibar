import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, FileCode, Plus, Layers } from 'lucide-react';
import { ProblemManagerWorkspace } from './ProblemManagerWorkspace';

export const revalidate = 0;

interface OutlineManagerProps {
  params: Promise<{ slug: string; outlineId: string }>;
}

export default async function OutlineProblemManagerPage(props: OutlineManagerProps) {
  const params = await props.params;
  const user = await getCurrentUser();

  const outline = db.select().from(outlines).where(and(eq(outlines.id, params.outlineId), eq(outlines.is_deleted, 0))).get();
  if (!outline) {
    notFound();
  }

  const project = db.select().from(projects).where(and(eq(projects.id, outline.project_id), eq(projects.is_deleted, 0))).get();
  if (!project) {
    notFound();
  }

  const problemList = db
    .select()
    .from(problems)
    .where(and(eq(problems.outline_id, outline.id), eq(problems.is_deleted, 0)))
    .all();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/projects/${project.slug}?sub=${outline.id}`}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span>{project.name}</span>
                <span>/</span>
                <span className="text-indigo-600 font-semibold">{outline.code}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {outline.title} - Problem Builder
              </h1>
            </div>
          </div>
        </div>

        {/* Client Interactive Workspace (Manual LaTeX Builder + Gemini OCR Modal) */}
        <ProblemManagerWorkspace
          outlineId={outline.id}
          slug={project.slug}
          initialProblems={problemList}
        />

      </main>
    </div>
  );
}
