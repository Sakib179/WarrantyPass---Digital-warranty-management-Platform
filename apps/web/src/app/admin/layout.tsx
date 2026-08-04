'use client';

import type { ReactNode } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';

export default function AdminLayout({ children }: { children: ReactNode }): ReactNode {
  return <ProtectedRoute context="platform">{children}</ProtectedRoute>;
}
