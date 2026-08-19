import React from 'react';
import { db } from '@/db';
import { outlines, projects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { ConceptDetailWorkspace } from './ConceptDetailWorkspace';
import { WorkspaceTracker } from '@/components/WorkspaceTracker';

export const revalidate = 0;

interface DedicatedConceptPageProps {
  params: Promise<{ slug: string; outlineId: string; conceptId: string }>;
}

export default async function DedicatedConceptPage(props: DedicatedConceptPageProps) {
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

  // Parse all concepts in this subchapter
  let allConcepts: any[] = [];
  if (outline.concepts_json) {
    try {
      const parsed = JSON.parse(outline.concepts_json);
      if (Array.isArray(parsed)) {
        allConcepts = parsed.filter((c: any) => !c.is_deleted);
      }
    } catch (e) {}
  }

  // Find target concept by id or index fallback
  const conceptIndex = allConcepts.findIndex(
    (c, idx) => c.id === params.conceptId || String(idx) === params.conceptId
  );

  if (conceptIndex === -1) {
    notFound();
  }

  const currentConcept = allConcepts[conceptIndex];
  const conceptId = currentConcept.id || `concept-${conceptIndex}`;

  const prevConcept = conceptIndex > 0
    ? {
        id: allConcepts[conceptIndex - 1].id || `concept-${conceptIndex - 1}`,
        title: allConcepts[conceptIndex - 1].title || `Concept #${conceptIndex}`,
      }
    : null;

  const nextConcept = conceptIndex < allConcepts.length - 1
    ? {
        id: allConcepts[conceptIndex + 1].id || `concept-${conceptIndex + 1}`,
        title: allConcepts[conceptIndex + 1].title || `Concept #${conceptIndex + 2}`,
      }
    : null;

  const parentChapter = outline.parent_id
    ? db.select().from(outlines).where(and(eq(outlines.id, outline.parent_id), eq(outlines.is_deleted, 0))).get()
    : null;

  const conceptTitle = currentConcept.title || `Concept #${conceptIndex + 1}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <WorkspaceTracker
        workspaceType="concept_detail"
        title={`Opened Concept Note: ${conceptTitle}`}
        description={`Subchapter: [${outline.code}] ${outline.title} | ${project.name}`}
        metadata={{
          slug: project.slug,
          outlineId: outline.id,
          conceptId,
          conceptTitle,
          subchapterCode: outline.code,
        }}
      />
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <ConceptDetailWorkspace
          outlineId={outline.id}
          slug={project.slug}
          projectTitle={project.name}
          subchapterCode={outline.code}
          subchapterTitle={outline.title}
          parentChapter={parentChapter ? { id: parentChapter.id, code: parentChapter.code, title: parentChapter.title } : null}
          concept={{
            id: conceptId,
            title: currentConcept.title || `Concept #${conceptIndex + 1}`,
            content: currentConcept.content || '',
            status: currentConcept.status === 'completed' ? 'completed' : 'unread',
            examples: currentConcept.examples || [],
          }}
          conceptIndex={conceptIndex}
          totalConceptsCount={allConcepts.length}
          prevConcept={prevConcept}
          nextConcept={nextConcept}
        />
      </main>

      <Footer />
    </div>
  );
}
