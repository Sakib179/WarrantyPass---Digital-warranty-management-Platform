import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { BusinessRegistrationForm } from '@/components/auth/business-registration-form';

export const metadata: Metadata = { title: 'Business application' };

export default function BusinessRegistrationPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Business application"
      title="Apply to issue trusted warranties"
      description="Tell us about your organization. Verification review is required before business-issued warranties are enabled."
    >
      <BusinessRegistrationForm />
    </AuthShell>
  );
}
