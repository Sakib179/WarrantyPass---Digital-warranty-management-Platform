'use client';

import { Alert } from '@warrantypass/ui';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { ResendVerificationForm } from './recovery-forms';

export function CheckEmailContent(): ReactNode {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const business = searchParams.get('business') === '1';
  return (
    <div className="space-y-5">
      <Alert title={business ? 'Business draft saved' : 'Account created'} tone="success">
        We sent a single-use verification link to {email || 'your email address'}.
        {business
          ? ' After verification, sign in to upload private documents and submit the application.'
          : ''}
      </Alert>
      <ResendVerificationForm defaultEmail={email} />
    </div>
  );
}
