import React from 'react';
import { db } from '@/db';
import { outlines, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Breadcrumb } from '@/components/Breadcrumb';
import { buildBreadcrumbs } from '@/lib/breadcrumbs';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { ConceptEditorWorkspace } from './ConceptEditorWorkspace';

export const revalidate = 0;

interface SubchapterConceptsPageProps {
  params: Promise<{ slug: string; outlineId: string }>;
}

export default async function SubchapterConceptsPage(props: SubchapterConceptsPageProps) {
  const params = await props.params;
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

  const parentChapter = outline.parent_id
    ? db.select().from(outlines).where(and(eq(outlines.id, outline.parent_id), eq(outlines.is_deleted, 0))).get()
    : null;

  const breadcrumbs = buildBreadcrumbs({
    project: { name: project.name, slug: project.slug },
    chapter: parentChapter ? { id: parentChapter.id, code: parentChapter.code, title: parentChapter.title } : null,
    subchapter: { id: outline.id, code: outline.code, title: outline.title },
    childPage: 'Core Concepts',
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Breadcrumb */}
        <div className="space-y-2">
          <Breadcrumb items={breadcrumbs} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/projects/${project.slug}?sub=${outline.id}`}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {outline.title} - Core Concepts
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Client Interactive Concept Workspace */}
        <ConceptEditorWorkspace
          outlineId={outline.id}
          slug={project.slug}
          initialDescription={outline.description}
          initialConceptsJson={outline.concepts_json}
        />

      </main>
      <Footer />
    </div>
  );
}
