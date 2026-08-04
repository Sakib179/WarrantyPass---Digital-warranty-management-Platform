import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/recovery-forms';

export const metadata: Metadata = { title: 'Recover your password' };

export default function ForgotPasswordPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter your email. WarrantyPass always returns the same confirmation to protect account privacy."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
