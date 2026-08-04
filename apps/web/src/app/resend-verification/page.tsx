import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { ResendVerificationForm } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Resend verification' };

export default function ResendVerificationPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Email verification"
      title="Request a new verification link"
      description="Previous unused links are invalidated when a new one is sent."
    >
      <ResendVerificationForm />
    </AuthShell>
  );
}
