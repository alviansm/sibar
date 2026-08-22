export const DEFAULT_WORKSPACE_THUMBNAIL = '/images/public-examination-preparation-concept.jpg';

export const WORKSPACE_CATEGORIES = [
  'General',
  'Mathematics',
  'Physics',
  'Computer Science',
  'Engineering',
  'Chemistry',
  'Biology',
  'Data Science & AI',
  'Economics & Finance',
  'Philosophy & Logic',
  'Languages',
  'Public Examination',
] as const;

export type WorkspaceCategory = typeof WORKSPACE_CATEGORIES[number] | string;
