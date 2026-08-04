import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { EmailVerificationResult } from '@/components/auth/token-result';

export const metadata: Metadata = { title: 'Verify email' };

export default function VerifyEmailPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Email verification"
      title="Verifying your account"
      description="WarrantyPass is checking the single-use verification link."
    >
      <Suspense fallback={<p>Verifying…</p>}>
        <EmailVerificationResult />
      </Suspense>
    </AuthShell>
  );
}
