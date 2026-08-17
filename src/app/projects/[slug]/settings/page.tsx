import React from 'react';
import { db } from '@/db';
import { projects, outlines } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { Navbar } from '@/components/Navbar';
import { getCurrentUser } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Settings, FolderTree } from 'lucide-react';
import { ProjectSettingsForm } from './ProjectSettingsForm';
import { OutlineTreeEditor } from './OutlineTreeEditor';

export const revalidate = 0;

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage(props: SettingsPageProps) {
  const params = await props.params;
  const user = await getCurrentUser();

  const project = db.select().from(projects).where(and(eq(projects.slug, params.slug), eq(projects.is_deleted, 0))).get();
  if (!project) {
    notFound();
  }

  const allOutlines = db
    .select()
    .from(outlines)
    .where(and(eq(outlines.project_id, project.id), eq(outlines.is_deleted, 0)))
    .orderBy(asc(outlines.sort_order))
    .all();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar username={user?.username || 'admin'} fullName={user?.fullName} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Breadcrumbs */}
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${project.slug}`}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <span>Project & Outline Settings</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Manage syllabus taxonomy for {project.name}
            </p>
          </div>
        </div>

        {/* Section 1: Project Metadata Editor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
            Project Metadata
          </h2>
          <ProjectSettingsForm project={project} />
        </div>

        {/* Section 2: Interactive Outline Tree Manager */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-m3-1 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-indigo-600" />
              <span>Taxonomy Tree Editor</span>
            </h2>
            <span className="text-xs text-slate-500">Add, rename, reorder chapter nodes</span>
          </div>

          <OutlineTreeEditor projectId={project.id} initialOutlines={allOutlines} />
        </div>

      </main>
    </div>
  );
}
