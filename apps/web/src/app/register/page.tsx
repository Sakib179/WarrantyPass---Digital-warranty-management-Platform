import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { CustomerRegistrationForm } from '@/components/auth/customer-registration-form';

export const metadata: Metadata = { title: 'Create customer account' };

export default function CustomerRegistrationPage(): ReactNode {
  return (
    <AuthShell
      eyebrow="Customer account"
      title="Create your warranty wallet"
      description="Start with an email address. Verified warranties from connected businesses will arrive in one place."
    >
      <CustomerRegistrationForm />
    </AuthShell>
  );
}
