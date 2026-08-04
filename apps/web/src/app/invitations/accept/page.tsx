import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { InvitationAcceptance } from '@/components/auth/invitation-acceptance';

export const metadata: Metadata = { title: 'Accept business invitation' };

export default function InvitationAcceptancePage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Business invitation"
      title="Join a WarrantyPass workspace"
      description="Invitations are single-use and tied to the email address that received them."
    >
      <Suspense fallback={<p>Checking invitation…</p>}>
        <InvitationAcceptance />
      </Suspense>
    </AuthShell>
  );
}
