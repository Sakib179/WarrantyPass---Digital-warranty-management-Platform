import { FileCheck2, LayoutDashboard, Settings, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';

export const businessNavigation = [
  {
    label: 'Overview',
    href: '/business/dashboard',
    icon: <LayoutDashboard aria-hidden="true" size={19} />,
  },
  {
    label: 'Application',
    href: '/business/application',
    icon: <FileCheck2 aria-hidden="true" size={19} />,
  },
  { label: 'Members', href: '/business/members', icon: <Users aria-hidden="true" size={19} /> },
  { label: 'Roles', href: '/business/roles', icon: <ShieldCheck aria-hidden="true" size={19} /> },
  {
    label: 'Business settings',
    href: '/business/settings',
    icon: <Settings aria-hidden="true" size={19} />,
  },
] satisfies Array<{ label: string; href: string; icon: ReactNode }>;

export function BusinessAreaGuard({ children }: { children: ReactNode }): ReactNode {
  return children;
}
