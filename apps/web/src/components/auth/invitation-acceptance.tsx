'use client';

import { Alert, Button } from '@warrantypass/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { useAuth } from './auth-provider';
import { apiRequest, ApiClientError } from '@/lib/api-client';

export function InvitationAcceptance(): ReactNode {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const token = searchParams.get('token');

  if (auth.status === 'unauthenticated') {
    return (
      <Alert title="Sign in to continue">
        Use the verified email address that received this invitation, then return to the invitation
        link.
      </Alert>
    );
  }
  return (
    <div className="space-y-5">
      <Alert title="Business workspace invitation">
        WarrantyPass will verify that this invitation belongs to your signed-in email before adding
        the membership.
      </Alert>
      {error ? (
        <Alert title="Invitation not accepted" tone="danger">
          {error}
        </Alert>
      ) : null}
      <Button
        fullWidth
        disabled={busy || !token || auth.status !== 'authenticated'}
        onClick={() =>
          void (async () => {
            if (!token) return;
            setBusy(true);
            setError(null);
            try {
              await apiRequest('/business/invitations/accept', {
                method: 'POST',
                body: JSON.stringify({ token }),
              });
              await auth.refreshUser();
              router.replace('/business/dashboard');
            } catch (caught) {
              setError(
                caught instanceof ApiClientError
                  ? caught.message
                  : 'The invitation could not be accepted.',
              );
            } finally {
              setBusy(false);
            }
          })()
        }
      >
        {busy ? 'Accepting invitation…' : 'Accept invitation'}
      </Button>
    </div>
  );
}
