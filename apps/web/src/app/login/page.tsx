import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Customer sign in' };

export default function CustomerLoginPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Customer account"
      title="Welcome back"
      description="Sign in to reach your digital warranty wallet."
    >
      <Suspense fallback={<p>Loading secure sign in…</p>}>
        <LoginForm accountType="customer" />
      </Suspense>
    </AuthShell>
  );
}
