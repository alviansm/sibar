'use server';

import { db } from '@/db';
import { projects, outlines, problems } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { cryptoNativeUUID } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/telemetry';

export async function createProjectAction(formData: FormData) {
  const name = formData.get('name') as string;
  const reference_material = formData.get('reference_material') as string;
  const target_milestone = formData.get('target_milestone') as string;
  const category = (formData.get('category') as string)?.trim() || 'General';
  const thumbnail_url = (formData.get('thumbnail_url') as string)?.trim() || null;

  if (!name || !reference_material || !target_milestone) {
    return { error: 'All fields are required.' };
  }

  // Generate slug
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = cryptoNativeUUID();
  const now = Math.floor(Date.now() / 1000);

  try {
    db.insert(projects)
      .values({
        id,
        name,
        slug: `${slug}-${id.substring(0, 4)}`,
        category,
        thumbnail_url,
        reference_material,
        target_milestone,
        status: 'active',
        last_accessed_at: now,
        created_at: now,
      })
      .run();

    await logActivity({
      activityType: 'project_create',
      category: 'project',
      title: `Created Study Project: ${name}`,
      description: `Category: ${category} | Target Milestone: ${target_milestone} | Reference: ${reference_material}`,
      metadata: { projectId: id, name, category, slug: `${slug}-${id.substring(0, 4)}` },
    });

    revalidatePath('/dashboard');
    revalidatePath('/my-learning');
    return { success: true, slug: `${slug}-${id.substring(0, 4)}` };
  } catch (err: any) {
    return { error: err.message || 'Failed to create project.' };
  }
}

export async function updateProjectAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const reference_material = formData.get('reference_material') as string;
  const target_milestone = formData.get('target_milestone') as string;
  const category = (formData.get('category') as string)?.trim() || 'General';
  const thumbnail_url = formData.has('thumbnail_url') ? ((formData.get('thumbnail_url') as string)?.trim() || null) : undefined;
  const status = (formData.get('status') as 'active' | 'paused' | 'completed') || 'active';

  try {
    const updateData: any = {
      name,
      reference_material,
      target_milestone,
      category,
      status,
    };
    if (thumbnail_url !== undefined) {
      updateData.thumbnail_url = thumbnail_url;
    }

    db.update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .run();

    const proj = db.select().from(projects).where(eq(projects.id, id)).get();
    if (proj) {
      await logActivity({
        activityType: 'project_update',
        category: 'project',
        title: `Updated Project Settings: ${name || proj.name}`,
        description: `Category: ${category} | Status: ${status} | Target: ${target_milestone || proj.target_milestone}`,
        metadata: { projectId: id, name, category, status, slug: proj.slug },
      });
      revalidatePath(`/projects/${proj.slug}`);
      revalidatePath(`/projects/${proj.slug}/settings`);
      revalidatePath('/dashboard');
      revalidatePath('/my-learning');
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update project.' };
  }
}

export async function touchProjectLastAccessedAction(idOrSlug: string) {
  try {
    const now = Math.floor(Date.now() / 1000);
    db.update(projects)
      .set({ last_accessed_at: now })
      .where(idOrSlug.includes('-') ? eq(projects.slug, idOrSlug) : eq(projects.id, idOrSlug))
      .run();
    return { success: true };
  } catch (err) {
    return { error: 'Failed to touch project' };
  }
}


export async function createOutlineNodeAction(
  projectId: string,
  parentId: string | null,
  code: string,
  title: string,
  description: string = '',
  sortOrder: number = 0
) {
  const id = cryptoNativeUUID();
  const now = Math.floor(Date.now() / 1000);

  try {
    db.insert(outlines)
      .values({
        id,
        project_id: projectId,
        parent_id: parentId,
        code,
        title,
        description,
        sort_order: sortOrder,
        status: 'unvisited',
        created_at: now,
      })
      .run();

    const proj = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (proj) {
      revalidatePath(`/projects/${proj.slug}`);
      revalidatePath(`/projects/${proj.slug}/settings`);
    }

    return { success: true, id };
  } catch (err: any) {
    return { error: err.message || 'Failed to add outline node.' };
  }
}

export async function updateOutlineNodeAction(
  id: string,
  code: string,
  title: string,
  description: string,
  sortOrder: number,
  status?: 'unvisited' | 'in_progress' | 'mastered'
) {
  try {
    const node = db.select().from(outlines).where(eq(outlines.id, id)).get();
    if (!node) return { error: 'Node not found' };

    db.update(outlines)
      .set({
        code,
        title,
        description,
        sort_order: sortOrder,
        ...(status ? { status } : {}),
      })
      .where(eq(outlines.id, id))
      .run();

    const proj = db.select().from(projects).where(eq(projects.id, node.project_id)).get();
    if (proj) {
      revalidatePath(`/projects/${proj.slug}`);
      revalidatePath(`/projects/${proj.slug}/settings`);
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to update node.' };
  }
}

export async function deleteOutlineNodeAction(id: string) {
  try {
    const node = db.select().from(outlines).where(eq(outlines.id, id)).get();
    if (!node) return { error: 'Node not found' };

    // 1. Soft-delete target node
    db.update(outlines)
      .set({ is_deleted: 1 })
      .where(eq(outlines.id, id))
      .run();

    // 2. Soft-delete child subchapters if any
    const children = db.select().from(outlines).where(eq(outlines.parent_id, id)).all();
    db.update(outlines)
      .set({ is_deleted: 1 })
      .where(eq(outlines.parent_id, id))
      .run();

    // 3. Soft-delete problems associated with this node or its children
    const outlineIdsToSoftDelete = [id, ...children.map((c) => c.id)];
    for (const oId of outlineIdsToSoftDelete) {
      db.update(problems)
        .set({ is_deleted: 1 })
        .where(eq(problems.outline_id, oId))
        .run();
    }

    const proj = db.select().from(projects).where(eq(projects.id, node.project_id)).get();
    if (proj) {
      revalidatePath(`/projects/${proj.slug}`);
      revalidatePath(`/projects/${proj.slug}/settings`);
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete node.' };
  }
}

export async function importTaxonomyAction(
  projectId: string,
  chaptersData: any[],
  generateProblems: boolean = false
) {
  const now = Math.floor(Date.now() / 1000);

  try {
    const proj = db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!proj) return { error: 'Project not found.' };

    let totalChaptersCount = 0;
    let totalSubchaptersCount = 0;
    let totalProblemsCount = 0;

    for (let cIdx = 0; cIdx < chaptersData.length; cIdx++) {
      const ch = chaptersData[cIdx];
      const chId = cryptoNativeUUID();

      // 1. Insert Chapter Node
      db.insert(outlines)
        .values({
          id: chId,
          project_id: projectId,
          parent_id: null,
          code: ch.code || `Ch ${cIdx + 1}`,
          title: ch.title || `Chapter ${cIdx + 1}`,
          description: ch.description || '',
          sort_order: cIdx * 10,
          status: 'unvisited',
          created_at: now,
        })
        .run();
      totalChaptersCount++;

      // 2. Insert Subchapters
      const subs = Array.isArray(ch.subchapters) ? ch.subchapters : [];
      for (let sIdx = 0; sIdx < subs.length; sIdx++) {
        const sub = subs[sIdx];
        const subId = cryptoNativeUUID();

        db.insert(outlines)
          .values({
            id: subId,
            project_id: projectId,
            parent_id: chId,
            code: sub.code || `${cIdx}.${sIdx + 1}`,
            title: sub.title || `Subchapter ${sIdx + 1}`,
            description: sub.description || '',
            sort_order: cIdx * 10 + sIdx + 1,
            status: 'unvisited',
            created_at: now,
          })
          .run();
        totalSubchaptersCount++;

        // 3. Optional Auto-generated Problems
        if (generateProblems && Array.isArray(sub.problems)) {
          for (const prob of sub.problems) {
            const pId = cryptoNativeUUID();
            db.insert(problems)
              .values({
                id: pId,
                outline_id: subId,
                problem_statement: prob.problem_statement || `Sample rep for ${sub.title}`,
                solution_guide: prob.solution_guide || 'Reference solution steps',
                problem_type: prob.problem_type || 'calculation',
                options_json: prob.options ? JSON.stringify(prob.options) : null,
                difficulty: prob.difficulty || 2,
                created_at: now,
              })
              .run();
            totalProblemsCount++;
          }
        }
      }
    }

    revalidatePath(`/projects/${proj.slug}`);
    revalidatePath(`/projects/${proj.slug}/settings`);

    await logActivity({
      activityType: 'taxonomy_import',
      category: 'project',
      title: `Imported Syllabus Taxonomy: ${proj.name}`,
      description: `Generated ${totalChaptersCount} chapters, ${totalSubchaptersCount} subchapters, ${totalProblemsCount} problems.`,
      metadata: {
        projectId,
        slug: proj.slug,
        chaptersCount: totalChaptersCount,
        subchaptersCount: totalSubchaptersCount,
        problemsCount: totalProblemsCount,
      },
    });

    return {
      success: true,
      chaptersCount: totalChaptersCount,
      subchaptersCount: totalSubchaptersCount,
      problemsCount: totalProblemsCount,
    };
  } catch (err: any) {
    console.error('Error importing taxonomy:', err);
    return { error: err.message || 'Failed to import taxonomy tree.' };
  }
}

export async function saveConceptsListAction(outlineId: string, concepts: any[]) {
  try {
    const node = db.select().from(outlines).where(eq(outlines.id, outlineId)).get();
    if (!node) return { error: 'Outline node not found' };

    const conceptsJson = JSON.stringify(concepts);
    db.update(outlines)
      .set({ concepts_json: conceptsJson })
      .where(eq(outlines.id, outlineId))
      .run();

    const proj = db.select().from(projects).where(eq(projects.id, node.project_id)).get();
    if (proj) {
      revalidatePath(`/projects/${proj.slug}`);
      revalidatePath(`/projects/${proj.slug}/outlines/${outlineId}/concepts`);
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'Failed to save concepts list.' };
  }
}

export async function toggleConceptStatusAction(outlineId: string, conceptId: string) {
  try {
    const node = db.select().from(outlines).where(eq(outlines.id, outlineId)).get();
    if (!node) return { error: 'Outline node not found' };

    let concepts: any[] = [];
    if (node.concepts_json) {
      try {
        const parsed = JSON.parse(node.concepts_json);
        if (Array.isArray(parsed)) concepts = parsed;
      } catch (e) {}
    }

    let updatedStatus = 'completed';
    let targetConceptTitle = 'Concept Note';

    concepts = concepts.map((c) => {
      if (c.id === conceptId) {
        targetConceptTitle = c.title || targetConceptTitle;
        const newStatus = c.status === 'completed' ? 'unread' : 'completed';
        updatedStatus = newStatus;
        return { ...c, status: newStatus };
      }
      return c;
    });

    const activeConcepts = concepts.filter((c) => !c.is_deleted);
    const isAllCompleted = activeConcepts.length > 0 && activeConcepts.every((c) => c.status === 'completed');
    const outlineStatus = isAllCompleted ? 'mastered' : 'in_progress';

    db.update(outlines)
      .set({
        concepts_json: JSON.stringify(concepts),
        status: outlineStatus,
      })
      .where(eq(outlines.id, outlineId))
      .run();

    const proj = db.select().from(projects).where(eq(projects.id, node.project_id)).get();
    if (proj) {
      revalidatePath(`/projects/${proj.slug}`);
      revalidatePath(`/projects/${proj.slug}/outlines/${outlineId}/concepts`);
      revalidatePath(`/projects/${proj.slug}/outlines/${outlineId}/concepts/${conceptId}`);

      await logActivity({
        activityType: updatedStatus === 'completed' ? 'concept_complete' : 'concept_uncomplete',
        category: 'concept',
        title: `${updatedStatus === 'completed' ? 'Mastered' : 'Reopened'} Concept: ${targetConceptTitle}`,
        description: `Subchapter: [${node.code}] ${node.title} in ${proj.name}`,
        metadata: {
          outlineId,
          conceptId,
          conceptTitle: targetConceptTitle,
          status: updatedStatus,
          subchapterCode: node.code,
          projectSlug: proj.slug,
        },
      });
    }

    return { success: true, newStatus: updatedStatus };
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle concept status.' };
  }
}
