import React from 'react';
import { db } from '@/db';
import { projects, outlines } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WorkspaceTracker } from '@/components/WorkspaceTracker';
import { MyLearningWorkspace } from './MyLearningWorkspace';
import { ProjectCardData } from '@/components/ProjectCard';

export const revalidate = 0;

export default async function MyLearningPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all active, non-deleted projects
  const projectRows = db
    .select()
    .from(projects)
    .where(eq(projects.is_deleted, 0))
    .all();

  const allProjects: ProjectCardData[] = projectRows.map((proj) => {
    const projOutlines = db
      .select()
      .from(outlines)
      .where(and(eq(outlines.project_id, proj.id), eq(outlines.is_deleted, 0)))
      .all();

    const subchapters = projOutlines.filter((o) => o.parent_id !== null);
    const totalSubchapters = subchapters.length;
    const masteredSubchapters = subchapters.filter((s) => s.status === 'mastered').length;
    const progressPct =
      totalSubchapters > 0 ? Math.round((masteredSubchapters / totalSubchapters) * 100) : 0;

    return {
      id: proj.id,
      name: proj.name,
      slug: proj.slug,
      category: proj.category || 'General',
      thumbnail_url: proj.thumbnail_url || null,
      reference_material: proj.reference_material,
      target_milestone: proj.target_milestone,
      status: proj.status,
      created_at: proj.created_at,
      last_accessed_at: proj.last_accessed_at || null,
      totalSubchapters,
      masteredSubchapters,
      progressPct,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100">
      <WorkspaceTracker
        workspaceType="dashboard"
        title="Opened My Learning Page"
        description="Explored full study projects catalog, categories, and syllabus tracks."
      />
      <Navbar username={user.username} fullName={user.fullName} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <MyLearningWorkspace initialProjects={allProjects} />
      </main>

      <Footer />
    </div>
  );
}
