import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || process.env.JWT_SECRET || 'sibar-super-secret-jwt-key-2026-math-strava-telemetry'
);

const COOKIE_NAME = 'session';

export interface UserSessionPayload {
  userId: string;
  username: string;
  fullName?: string | null;
  expiresAt: number;
}

export async function signJWT(payload: { userId: string; username: string; fullName?: string | null }) {
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
  return await new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyJWT(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload as unknown as UserSessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyJWT(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.userId) return null;
  const user = db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.full_name,
      quoteRefreshInterval: users.quote_refresh_interval,
      quoteCategory: users.quote_category,
      createdAt: users.created_at,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .get();


  return user || null;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

