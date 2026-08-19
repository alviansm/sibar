'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signJWT, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { checkRateLimit, recordFailedAttempt, resetFailedAttempts } from '@/lib/rateLimit';
import { generateCaptchaChallenge, verifyCaptchaChallenge, CaptchaChallenge } from '@/lib/captcha';
import { logActivity } from '@/lib/telemetry';
import { getSession } from '@/lib/auth';

export async function getCaptchaAction(): Promise<CaptchaChallenge> {
  return generateCaptchaChallenge();
}

export async function loginAction(prevState: any, formData: FormData) {
  // 1. Get Client IP Address
  const headerStore = await headers();
  const rawIp = headerStore.get('x-forwarded-for') || headerStore.get('x-real-ip') || '127.0.0.1';
  const clientIp = rawIp.split(',')[0].trim();

  // 2. Rate Limiting Check (Max 5 attempts in 30 minutes)
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return {
      error: `Too many failed login attempts from your IP (${clientIp}). Please try again in ${rateLimit.retryAfterMinutes} minute(s).`,
    };
  }

  // 3. Captcha Challenge Verification
  const captchaAnswer = formData.get('captcha_answer') as string;
  const captchaToken = formData.get('captcha_token') as string;
  const captchaTimestamp = Number(formData.get('captcha_timestamp') || 0);
  const captchaNonce = formData.get('captcha_nonce') as string;

  const isCaptchaValid = verifyCaptchaChallenge(
    captchaAnswer,
    captchaToken,
    captchaTimestamp,
    captchaNonce
  );

  if (!isCaptchaValid) {
    recordFailedAttempt(clientIp);
    const updatedLimit = checkRateLimit(clientIp);
    if (!updatedLimit.allowed) {
      return {
        error: `Too many failed attempts. Login locked for ${updatedLimit.retryAfterMinutes} minute(s).`,
      };
    }
    return {
      error: `Incorrect security captcha. Attempts remaining before lockout: ${updatedLimit.remainingAttempts}`,
    };
  }

  // 4. Username & Password Validation
  const username = (formData.get('username') as string || '').trim();
  const password = formData.get('password') as string || '';

  if (!username || !password) {
    recordFailedAttempt(clientIp);
    return { error: 'Username and password are required.' };
  }

  const user = db.select().from(users).where(eq(users.username, username)).get();

  if (!user) {
    recordFailedAttempt(clientIp);
    const updatedLimit = checkRateLimit(clientIp);
    if (!updatedLimit.allowed) {
      return {
        error: `Too many failed attempts. Login locked for ${updatedLimit.retryAfterMinutes} minute(s).`,
      };
    }
    return {
      error: `Invalid username or password. Attempts remaining: ${updatedLimit.remainingAttempts}`,
    };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    recordFailedAttempt(clientIp);
    const updatedLimit = checkRateLimit(clientIp);
    if (!updatedLimit.allowed) {
      return {
        error: `Too many failed attempts. Login locked for ${updatedLimit.retryAfterMinutes} minute(s).`,
      };
    }
    return {
      error: `Invalid username or password. Attempts remaining: ${updatedLimit.remainingAttempts}`,
    };
  }

  // Success: Clear rate limit attempt counter for this IP
  resetFailedAttempts(clientIp);

  const token = await signJWT({ userId: user.id, username: user.username });
  await setSessionCookie(token);

  await logActivity({
    userId: user.id,
    activityType: 'auth_login',
    category: 'auth',
    title: `Signed in as @${user.username}`,
    description: `Successful login session initialized from IP ${clientIp}.`,
    metadata: { username: user.username, ip: clientIp },
  });

  redirect('/dashboard');
}

export async function logoutAction() {
  const session = await getSession();
  if (session?.userId) {
    await logActivity({
      userId: session.userId,
      activityType: 'auth_logout',
      category: 'auth',
      title: `Signed out (@${session.username})`,
      description: 'Session cookie terminated.',
      metadata: { username: session.username },
    });
  }

  await clearSessionCookie();
  redirect('/login');
}
