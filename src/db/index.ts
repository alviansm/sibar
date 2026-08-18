import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

function getDatabasePath(): string {
  const envUrl = process.env.DATABASE_URL || 'sibar.db';
  if (path.isAbsolute(envUrl)) {
    return envUrl;
  }

  // Detect standalone build directory or standard execution context
  const cwd = process.cwd();
  let baseDir = cwd;

  // If executing inside .next/standalone or subfolder
  if (cwd.includes('.next/standalone')) {
    const idx = cwd.indexOf('.next/standalone');
    baseDir = cwd.substring(0, idx);
    if (!baseDir) baseDir = path.resolve(cwd, '../..');
  }

  const fullPath = path.resolve(baseDir, envUrl);
  
  // Ensure target directory exists
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return fullPath;
}

const dbPath = getDatabasePath();
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Ensure tables exist on database initialization
function ensureTablesExist() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      reference_material TEXT NOT NULL,
      target_milestone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outlines (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_id TEXT,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unvisited',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      outline_id TEXT NOT NULL REFERENCES outlines(id) ON DELETE CASCADE,
      problem_statement TEXT NOT NULL,
      solution_guide TEXT NOT NULL,
      problem_type TEXT NOT NULL,
      options_json TEXT,
      difficulty INTEGER NOT NULL DEFAULT 1,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS problem_attempts (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      outline_id TEXT NOT NULL REFERENCES outlines(id) ON DELETE CASCADE,
      time_spent_seconds INTEGER NOT NULL,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      outcome TEXT NOT NULL,
      handwritten_file_path TEXT,
      ai_feedback_json TEXT,
      friction_score INTEGER NOT NULL DEFAULT 1,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  // Migrate existing tables to add columns if missing
  const alterTables = ['projects', 'outlines', 'problems', 'problem_attempts'];
  for (const tbl of alterTables) {
    try {
      sqlite.exec(`ALTER TABLE ${tbl} ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0`);
    } catch (e) {}
  }
  try {
    sqlite.exec(`ALTER TABLE outlines ADD COLUMN concepts_json TEXT`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE problems ADD COLUMN correct_option_index INTEGER`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE problems ADD COLUMN correct_option_indices TEXT`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE problems ADD COLUMN exercise_id TEXT`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN full_name TEXT`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN quote_refresh_interval TEXT NOT NULL DEFAULT 'hourly'`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN quote_category TEXT NOT NULL DEFAULT 'inspirational'`);
  } catch (e) {}

  // New columns for three-category problem system
  try {
    sqlite.exec(`ALTER TABLE problems ADD COLUMN problem_kind TEXT NOT NULL DEFAULT 'example'`);
  } catch (e) {}
  // Auto-migrate: any problem with an exercise_id is an exercise problem
  try {
    sqlite.exec(`UPDATE problems SET problem_kind = 'exercise' WHERE exercise_id IS NOT NULL AND exercise_id != ''`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE exercise_sets ADD COLUMN is_timed INTEGER NOT NULL DEFAULT 1`);
  } catch (e) {}

  // New columns for session persistence & server-side timer
  try {
    sqlite.exec(`ALTER TABLE exercise_session_attempts ADD COLUMN timer_mode TEXT NOT NULL DEFAULT 'none'`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE exercise_session_attempts ADD COLUMN countdown_seconds INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE exercise_session_attempts ADD COLUMN answers_json TEXT`);
  } catch (e) {}
  try {
    sqlite.exec(`ALTER TABLE exercise_session_attempts ADD COLUMN last_saved_at INTEGER`);
  } catch (e) {}


  // Create rate limit & exercise tables if missing
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS rate_limit_attempts (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      attempt_time INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON rate_limit_attempts(ip, attempt_time);

    CREATE TABLE IF NOT EXISTS exercise_sets (
      id TEXT PRIMARY KEY,
      outline_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      passing_grade INTEGER NOT NULL DEFAULT 70,
      is_timed INTEGER NOT NULL DEFAULT 1,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercise_session_attempts (
      id TEXT PRIMARY KEY,
      exercise_id TEXT NOT NULL,
      outline_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      total_questions INTEGER NOT NULL DEFAULT 0,
      correct_answers INTEGER NOT NULL DEFAULT 0,
      score_percentage INTEGER NOT NULL DEFAULT 0,
      is_passed INTEGER NOT NULL DEFAULT 0,
      attempt_number INTEGER NOT NULL DEFAULT 1,
      is_timed INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  // Ensure default admin-sibar user exists & credentials are updated
  const adminUsername = process.env.ADMIN_USERNAME || 'admin-sibar';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Merdeka1945ID!';
  const newPasswordHash = bcrypt.hashSync(adminPassword, 10);
  const now = Math.floor(Date.now() / 1000);

  // Check if legacy 'admin' user exists
  const legacyAdmin = sqlite.prepare('SELECT id FROM users WHERE username = ?').get('admin') as { id: string } | undefined;
  if (legacyAdmin) {
    sqlite.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?').run(adminUsername, newPasswordHash, legacyAdmin.id);
  } else {
    const targetUser = sqlite.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername) as { id: string } | undefined;
    if (!targetUser) {
      sqlite.prepare(`
        INSERT INTO users (id, username, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `).run('default-admin-uuid', adminUsername, newPasswordHash, now);
    } else {
      // Ensure password hash matches
      sqlite.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, targetUser.id);
    }
  }
}

ensureTablesExist();

export const db = drizzle(sqlite, { schema });
export { sqlite };
