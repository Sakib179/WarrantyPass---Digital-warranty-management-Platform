import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      description="The recovery link is single-use. Completing this form signs out existing sessions."
    >
      <Suspense fallback={<p>Loading secure reset…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
