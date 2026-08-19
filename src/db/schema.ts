import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name'),
  quote_refresh_interval: text('quote_refresh_interval', {
    enum: ['hourly', 'daily', 'always'],
  })
    .notNull()
    .default('hourly'),
  quote_category: text('quote_category').notNull().default('inspirational'),
  created_at: integer('created_at').notNull(),
});


export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  reference_material: text('reference_material').notNull(),
  target_milestone: text('target_milestone').notNull(),
  status: text('status', { enum: ['active', 'paused', 'completed'] })
    .notNull()
    .default('active'),
  is_deleted: integer('is_deleted').notNull().default(0),
  created_at: integer('created_at').notNull(),
});

export const outlines = sqliteTable('outlines', {
  id: text('id').primaryKey(),
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  parent_id: text('parent_id'),
  code: text('code').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  sort_order: integer('sort_order').notNull().default(0),
  status: text('status', { enum: ['unvisited', 'in_progress', 'mastered'] })
    .notNull()
    .default('unvisited'),
  concepts_json: text('concepts_json'),
  is_deleted: integer('is_deleted').notNull().default(0),
  created_at: integer('created_at').notNull(),
});

export const problems = sqliteTable('problems', {
  id: text('id').primaryKey(),
  outline_id: text('outline_id')
    .notNull()
    .references(() => outlines.id, { onDelete: 'cascade' }),
  exercise_id: text('exercise_id'),
  // 'example' = standalone worked example tied to a concept
  // 'exercise' = question inside an exercise set
  problem_kind: text('problem_kind', { enum: ['example', 'exercise'] }).notNull().default('example'),
  problem_statement: text('problem_statement').notNull(),
  solution_guide: text('solution_guide').notNull(),
  problem_type: text('problem_type', {
    enum: ['derivation', 'calculation', 'multiple_choice', 'essay'],
  }).notNull(),
  options_json: text('options_json'),
  correct_option_index: integer('correct_option_index'),
  correct_option_indices: text('correct_option_indices'),
  difficulty: integer('difficulty').notNull().default(1),
  is_deleted: integer('is_deleted').notNull().default(0),
  created_at: integer('created_at').notNull(),
});

export const problem_attempts = sqliteTable('problem_attempts', {
  id: text('id').primaryKey(),
  problem_id: text('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  outline_id: text('outline_id')
    .notNull()
    .references(() => outlines.id, { onDelete: 'cascade' }),
  time_spent_seconds: integer('time_spent_seconds').notNull(),
  attempt_number: integer('attempt_number').notNull().default(1),
  outcome: text('outcome', {
    enum: ['clean_solve', 'solved_with_hint', 'surrendered'],
  }).notNull(),
  handwritten_file_path: text('handwritten_file_path'),
  ai_feedback_json: text('ai_feedback_json'),
  friction_score: integer('friction_score').notNull().default(1),
  is_deleted: integer('is_deleted').notNull().default(0),
  created_at: integer('created_at').notNull(),
});

export const exercise_sets = sqliteTable('exercise_sets', {
  id: text('id').primaryKey(),
  outline_id: text('outline_id')
    .notNull()
    .references(() => outlines.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  passing_grade: integer('passing_grade').notNull().default(70),
  is_timed: integer('is_timed').notNull().default(1),
  is_deleted: integer('is_deleted').notNull().default(0),
  created_at: integer('created_at').notNull(),
});

export const exercise_session_attempts = sqliteTable('exercise_session_attempts', {
  id: text('id').primaryKey(),
  exercise_id: text('exercise_id').notNull(),
  outline_id: text('outline_id')
    .notNull()
    .references(() => outlines.id, { onDelete: 'cascade' }),
  started_at: integer('started_at').notNull(),
  finished_at: integer('finished_at'),
  duration_seconds: integer('duration_seconds').notNull().default(0),
  total_questions: integer('total_questions').notNull().default(0),
  correct_answers: integer('correct_answers').notNull().default(0),
  score_percentage: integer('score_percentage').notNull().default(0),
  is_passed: integer('is_passed').notNull().default(0),
  attempt_number: integer('attempt_number').notNull().default(1),
  is_timed: integer('is_timed').notNull().default(0),
  /** 'none' | 'stopwatch' | 'countdown' */
  timer_mode: text('timer_mode').notNull().default('none'),
  /** Total countdown seconds; 0 if not countdown */
  countdown_seconds: integer('countdown_seconds').notNull().default(0),
  /** JSON-serialised Record<number, string> of in-progress answers */
  answers_json: text('answers_json'),
  /** Unix timestamp of last auto-save */
  last_saved_at: integer('last_saved_at'),
  is_deleted: integer('is_deleted').notNull().default(0),
  created_at: integer('created_at').notNull(),
});

export const google_accounts = sqliteTable('google_accounts', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  account_name: text('account_name'),
  avatar_url: text('avatar_url'),
  refresh_token: text('refresh_token').notNull(),
  root_folder_id: text('root_folder_id'),
  is_default: integer('is_default').notNull().default(0),
  created_at: integer('created_at').notNull(),
});

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  google_account_id: text('google_account_id').references(() => google_accounts.id, { onDelete: 'set null' }),
  file_name: text('file_name').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  drive_file_id: text('drive_file_id').notNull(),
  web_view_link: text('web_view_link').notNull(),
  thumbnail_link: text('thumbnail_link'),
  entity_type: text('entity_type', { enum: ['concept', 'problem', 'exercise_set', 'attempt'] }).notNull(),
  entity_id: text('entity_id').notNull(),
  created_at: integer('created_at').notNull(),
});

