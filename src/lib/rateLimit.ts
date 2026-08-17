import { sqlite } from '@/db';
import { cryptoNativeUUID } from './utils';

const WINDOW_SECONDS = 30 * 60; // 30 minutes
const MAX_FAILED_ATTEMPTS = 5;

// Ensure rate_limit_attempts table exists
function ensureTableExists() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS rate_limit_attempts (
      id TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      attempt_time INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON rate_limit_attempts(ip, attempt_time);
  `);
}

export interface RateLimitResult {
  allowed: boolean;
  attemptsCount: number;
  remainingAttempts: number;
  retryAfterMinutes: number;
}

export function checkRateLimit(clientIp: string): RateLimitResult {
  ensureTableExists();
  const ip = clientIp || '127.0.0.1';
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - WINDOW_SECONDS;

  // Cleanup old records older than 24 hours to keep table compact
  try {
    sqlite.prepare('DELETE FROM rate_limit_attempts WHERE attempt_time < ?').run(now - 86400);
  } catch (e) {
    // Ignore cleanup error
  }

  const row = sqlite
    .prepare(
      'SELECT COUNT(*) as count, MIN(attempt_time) as oldest FROM rate_limit_attempts WHERE ip = ? AND attempt_time > ?'
    )
    .get(ip, windowStart) as { count: number; oldest: number | null };

  const attemptsCount = row?.count || 0;

  if (attemptsCount >= MAX_FAILED_ATTEMPTS) {
    const oldest = row.oldest || windowStart;
    const secondsRemaining = Math.max(1, oldest + WINDOW_SECONDS - now);
    const retryAfterMinutes = Math.ceil(secondsRemaining / 60);

    return {
      allowed: false,
      attemptsCount,
      remainingAttempts: 0,
      retryAfterMinutes,
    };
  }

  return {
    allowed: true,
    attemptsCount,
    remainingAttempts: MAX_FAILED_ATTEMPTS - attemptsCount,
    retryAfterMinutes: 0,
  };
}

export function recordFailedAttempt(clientIp: string): void {
  ensureTableExists();
  const ip = clientIp || '127.0.0.1';
  const now = Math.floor(Date.now() / 1000);
  const id = cryptoNativeUUID();

  sqlite
    .prepare('INSERT INTO rate_limit_attempts (id, ip, attempt_time) VALUES (?, ?, ?)')
    .run(id, ip, now);
}

export function resetFailedAttempts(clientIp: string): void {
  ensureTableExists();
  const ip = clientIp || '127.0.0.1';
  sqlite.prepare('DELETE FROM rate_limit_attempts WHERE ip = ?').run(ip);
}
