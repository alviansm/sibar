import React from 'react';
import { generateCaptchaChallenge } from '@/lib/captcha';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const initialCaptcha = generateCaptchaChallenge();

  return <LoginForm initialCaptcha={initialCaptcha} />;
}
