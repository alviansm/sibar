import React, { Suspense } from 'react';
import { generateCaptchaChallenge } from '@/lib/captcha';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const initialCaptcha = generateCaptchaChallenge();

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginForm initialCaptcha={initialCaptcha} />
    </Suspense>
  );
}
