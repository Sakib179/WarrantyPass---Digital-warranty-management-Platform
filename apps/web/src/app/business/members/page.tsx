import type { ReactNode } from 'react';

import { TeamManagement } from '@/components/business/team-management';

export default function MembersPage(): ReactNode {
  return <TeamManagement view="members" />;
}
