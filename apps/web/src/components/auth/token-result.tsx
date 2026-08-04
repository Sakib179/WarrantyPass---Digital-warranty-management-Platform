'use client';

import { Alert, Skeleton, buttonVariants } from '@warrantypass/ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { apiRequest, ApiClientError } from '@/lib/api-client';

export function EmailVerificationResult({
  emailChange = false,
}: {
  emailChange?: boolean;
}): ReactNode {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const started = useRef(false);
  const [state, setState] = useState<{ status: 'loading' | 'success' | 'error'; message?: string }>(
    token
      ? { status: 'loading' }
      : { status: 'error', message: 'The verification token is missing.' },
  );
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) return;
    void apiRequest<{ message: string }>(
      emailChange ? '/account/email/verify' : '/auth/email/verify',
      {
        method: 'POST',
        body: JSON.stringify({ token }),
        retryAuthentication: false,
      },
    )
      .then((result) => setState({ status: 'success', message: result.message }))
      .catch((error: unknown) =>
        setState({
          status: 'error',
          message:
            error instanceof ApiClientError
              ? error.message
              : 'The verification link could not be processed.',
        }),
      );
  }, [emailChange, token]);

  if (state.status === 'loading') {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <Alert
        title={state.status === 'success' ? 'Verification complete' : 'Verification unsuccessful'}
        tone={state.status === 'success' ? 'success' : 'danger'}
      >
        {state.message}
      </Alert>
      <Link href="/login" className={buttonVariants({ fullWidth: true })}>
        Continue to sign in
      </Link>
    </div>
  );
}
