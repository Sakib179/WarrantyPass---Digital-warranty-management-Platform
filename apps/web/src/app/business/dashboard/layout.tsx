'use client';

import type { ReactNode } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';

export default function BusinessDashboardLayout({ children }: { children: ReactNode }): ReactNode {
  return <ProtectedRoute context="business">{children}</ProtectedRoute>;
}
