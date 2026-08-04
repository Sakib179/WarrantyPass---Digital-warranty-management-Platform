import type { ReactNode } from 'react';

import { TeamManagement } from '@/components/business/team-management';

export default function RolesPage(): ReactNode {
  return <TeamManagement view="roles" />;
}
