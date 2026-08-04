'use client';

import type { ReactNode } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';

export default function CustomerDashboardLayout({ children }: { children: ReactNode }): ReactNode {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
