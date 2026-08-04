'use client';

import type { ReactNode } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';

export default function AccountLayout({ children }: { children: ReactNode }): ReactNode {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
