import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { EmailVerificationResult } from '@/components/auth/token-result';

export const metadata: Metadata = { title: 'Confirm new email' };

export default function VerifyEmailChangePage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Account security"
      title="Confirming your new email"
      description="Existing sessions are revoked after the email change is completed."
    >
      <Suspense fallback={<p>Confirming…</p>}>
        <EmailVerificationResult emailChange />
      </Suspense>
    </AuthShell>
  );
}
