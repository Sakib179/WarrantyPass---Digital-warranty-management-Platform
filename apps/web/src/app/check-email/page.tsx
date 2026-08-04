import { MailCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { CheckEmailContent } from '@/components/auth/check-email-content';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = { title: 'Check your email' };

export default function CheckEmailPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Email verification"
      title="Check your email"
      description="Your account exists, but sensitive actions remain unavailable until the email is verified."
    >
      <div className="mb-5 grid size-12 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
        <MailCheck aria-hidden="true" />
      </div>
      <Suspense fallback={<p>Preparing verification options…</p>}>
        <CheckEmailContent />
      </Suspense>
    </AuthShell>
  );
}
