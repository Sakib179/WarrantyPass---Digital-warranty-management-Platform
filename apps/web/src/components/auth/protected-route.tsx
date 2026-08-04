'use client';

import { Alert, Skeleton } from '@warrantypass/ui';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuth } from './auth-provider';

export function ProtectedRoute({
  children,
  context = 'customer',
  permission,
}: {
  children: ReactNode;
  context?: 'customer' | 'business' | 'platform';
  permission?: string;
}): ReactNode {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const authorized =
    auth.status === 'authenticated' &&
    (context === 'customer' ||
      (context === 'business' && Boolean(auth.user?.businesses.length)) ||
      (context === 'platform' &&
        Boolean(auth.user?.platformPermissions.length) &&
        (!permission || auth.user?.platformPermissions.includes(permission))));

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [auth.status, pathname, router]);

  if (auth.status === 'loading' || auth.status === 'unauthenticated') {
    return (
      <main className="mx-auto max-w-6xl space-y-4 p-6" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <span className="sr-only">Checking your secure session</span>
      </main>
    );
  }
  if (!authorized) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Alert tone="danger" title="Access unavailable">
          Your account does not have permission to open this area.
        </Alert>
      </main>
    );
  }
  return children;
}
