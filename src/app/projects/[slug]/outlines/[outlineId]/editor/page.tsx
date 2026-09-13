import React from 'react';
import { db } from '@/db';
import { outlines, projects, problems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { WordgardWorkspace } from './WordgardWorkspace';
import { WorkspaceTracker } from '@/components/WorkspaceTracker';
import { cryptoNativeUUID } from '@/lib/utils';

export const revalidate = 0;

interface EditorPageProps {
  params: Promise<{ slug: string; outlineId: string }>;
  searchParams: Promise<{
    type?: string;
    id?: string;
    exerciseId?: string;
    returnUrl?: string;
  }>;
}

export default async function DedicatedEditorPage(props: EditorPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

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

  const parentChapter = outline.parent_id
    ? db
        .select({ id: outlines.id, code: outlines.code, title: outlines.title })
        .from(outlines)
        .where(and(eq(outlines.id, outline.parent_id), eq(outlines.is_deleted, 0)))
        .get()
    : null;

  const type = (searchParams.type as 'concept' | 'example' | 'problem') || 'concept';
  const targetId = searchParams.id || 'new';
  const exerciseId = searchParams.exerciseId;

  // 1. Concept preparation
  let initialConcept: { id: string; title: string; content: string } | undefined;
  if (type === 'concept') {
    let conceptsList: any[] = [];
    if (outline.concepts_json) {
      try {
        const parsed = JSON.parse(outline.concepts_json);
        if (Array.isArray(parsed)) conceptsList = parsed;
      } catch (e) {}
    }

    const found = conceptsList.find((c) => c.id === targetId);
    if (found) {
      initialConcept = {
        id: found.id,
        title: found.title || 'Untitled Concept',
        content: found.content || '',
      };
    } else {
      initialConcept = {
        id: targetId === 'new' ? cryptoNativeUUID() : targetId,
        title: 'New Concept Note',
        content: '',
      };
    }
  }

  // 2. Problem / Example preparation
  let initialProblem: any | undefined;
  if (type === 'example' || type === 'problem') {
    if (targetId && targetId !== 'new') {
      const p = db
        .select()
        .from(problems)
        .where(and(eq(problems.id, targetId), eq(problems.is_deleted, 0)))
        .get();

      if (p) {
        let parsedOptions: string[] = ['', '', '', ''];
        if (p.options_json) {
          try {
            const opts = JSON.parse(p.options_json);
            if (Array.isArray(opts)) parsedOptions = opts;
          } catch (e) {}
        }

        let parsedCorrectIndices: number[] = [0];
        if (p.correct_option_indices) {
          try {
            const ind = JSON.parse(p.correct_option_indices);
            if (Array.isArray(ind)) parsedCorrectIndices = ind;
          } catch (e) {}
        } else if (typeof p.correct_option_index === 'number') {
          parsedCorrectIndices = [p.correct_option_index];
        }

        initialProblem = {
          id: p.id,
          statement: p.problem_statement || '',
          solution: p.solution_guide || '',
          problemType: p.problem_type as any,
          options: parsedOptions,
          correctOptionIndices: parsedCorrectIndices,
          difficulty: p.difficulty || 2,
        };
      }
    }

    if (!initialProblem) {
      initialProblem = {
        id: targetId === 'new' ? cryptoNativeUUID() : targetId,
        statement: '',
        solution: '',
        problemType: 'multiple_choice',
        options: ['', '', '', ''],
        correctOptionIndices: [0],
        difficulty: 2,
      };
    }
  }

  // Calculate default returnUrl
  let returnUrl = searchParams.returnUrl;
  if (!returnUrl) {
    if (type === 'concept') {
      returnUrl = `/projects/${project.slug}/outlines/${outline.id}/concepts`;
    } else if (type === 'example') {
      returnUrl = `/projects/${project.slug}/outlines/${outline.id}/examples`;
    } else if (type === 'problem') {
      returnUrl = exerciseId
        ? `/projects/${project.slug}/outlines/${outline.id}/exercise/${exerciseId}`
        : `/projects/${project.slug}/outlines/${outline.id}/exercise`;
    } else {
      returnUrl = `/projects/${project.slug}/outlines/${outline.id}`;
    }
  }

  const documentName =
    type === 'concept'
      ? initialConcept?.title || 'Concept Note'
      : type === 'example'
      ? 'Worked Example Problem'
      : 'Exercise Set Question';

  return (
    <>
      <WorkspaceTracker
        workspaceType="wordgard_document_editor"
        title={`Editing ${documentName} in Wordgard`}
        description={`Dedicated document focus canvas: [${outline.code}] ${outline.title} | ${project.name}`}
        metadata={{
          slug: project.slug,
          outlineId: outline.id,
          type,
          id: targetId,
          exerciseId,
        }}
      />
      <WordgardWorkspace
        outlineId={outline.id}
        slug={project.slug}
        projectTitle={project.name}
        subchapterCode={outline.code}
        subchapterTitle={outline.title}
        parentChapter={parentChapter}
        type={type}
        id={targetId}
        exerciseId={exerciseId}
        initialConcept={initialConcept}
        initialProblem={initialProblem}
        returnUrl={returnUrl}
      />
    </>
  );
}
