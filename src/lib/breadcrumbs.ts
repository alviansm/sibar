import { BreadcrumbSegment } from '@/components/Breadcrumb';

export interface ProjectBreadcrumbInfo {
  name: string;
  slug: string;
}

export interface OutlineBreadcrumbInfo {
  id: string;
  code: string;
  title: string;
}

export interface ChildPageBreadcrumbInfo {
  label: string;
  href?: string;
}

export interface BuildBreadcrumbOptions {
  project: ProjectBreadcrumbInfo;
  chapter?: OutlineBreadcrumbInfo | null;
  subchapter?: OutlineBreadcrumbInfo | null;
  exerciseSet?: { id: string; title: string } | null;
  childPage?: ChildPageBreadcrumbInfo | string | null;
}

export function buildBreadcrumbs(options: BuildBreadcrumbOptions): BreadcrumbSegment[] {
  const { project, chapter, subchapter, exerciseSet, childPage } = options;

  const items: BreadcrumbSegment[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      iconName: 'dashboard',
    },
    {
      label: project.name,
      href: `/projects/${project.slug}`,
      isCurrent: !subchapter && !chapter && !childPage,
      iconName: 'project',
    },
  ];

  if (chapter) {
    items.push({
      label: chapter.title,
      code: chapter.code,
      href: subchapter ? `/projects/${project.slug}?sub=${subchapter.id}` : `/projects/${project.slug}`,
      iconName: 'chapter',
    });
  }

  if (subchapter) {
    items.push({
      label: subchapter.title,
      code: subchapter.code,
      href: `/projects/${project.slug}?sub=${subchapter.id}`,
      isCurrent: !exerciseSet && !childPage,
      iconName: 'chapter',
    });
  }

  if (exerciseSet && subchapter) {
    const isExerciseSetCurrent = !childPage;
    items.push({
      label: exerciseSet.title,
      href: `/projects/${project.slug}/outlines/${subchapter.id}/exercise/${exerciseSet.id}`,
      isCurrent: isExerciseSetCurrent,
      iconName: 'exercise',
    });
  }

  if (childPage) {
    const label = typeof childPage === 'string' ? childPage : childPage.label;
    const href = typeof childPage === 'string' ? undefined : childPage.href;
    items.push({
      label,
      href,
      isCurrent: true,
    });
  }

  return items;
}
