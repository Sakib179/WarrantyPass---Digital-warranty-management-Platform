import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Business sign in' };

export default function BusinessLoginPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Business workspace"
      title="Sign in to your organization"
      description="Access depends on your business membership, role, and verification status."
    >
      <Suspense fallback={<p>Loading secure sign in…</p>}>
        <LoginForm accountType="business" />
      </Suspense>
    </AuthShell>
  );
}
