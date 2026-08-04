'use client';

import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@warrantypass/ui';
import {
  BadgeCheck,
  BellRing,
  Boxes,
  Building2,
  CircleHelp,
  ClipboardCheck,
  LayoutDashboard,
  MapPin,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatCard } from '@/components/dashboard/stat-card';

const navigation = [
  {
    label: 'Overview',
    href: '/business/dashboard',
    icon: <LayoutDashboard aria-hidden="true" size={19} />,
  },
  { label: 'Warranties', href: '#warranties', icon: <WalletCards aria-hidden="true" size={19} /> },
  { label: 'Products', href: '#products', icon: <Boxes aria-hidden="true" size={19} /> },
  { label: 'Claims', href: '#claims', icon: <CircleHelp aria-hidden="true" size={19} /> },
  { label: 'Service centres', href: '#centres', icon: <MapPin aria-hidden="true" size={19} /> },
  { label: 'Team & roles', href: '#team', icon: <Users aria-hidden="true" size={19} /> },
  { label: 'Recall notices', href: '#recalls', icon: <BellRing aria-hidden="true" size={19} /> },
  { label: 'Settings', href: '#settings', icon: <Settings aria-hidden="true" size={19} /> },
];

export default function BusinessDashboardPage(): ReactNode {
  const auth = useAuth();
  const business = auth.user?.businesses.find((item) => item.isCurrent) ?? auth.user?.businesses[0];
  return (
    <DashboardShell title="Business workspace" activeHref="/business/dashboard" items={navigation}>
      <Breadcrumbs
        items={[
          { label: 'Business', href: '/business/dashboard' },
          { label: 'Overview', href: '/business/dashboard' },
        ]}
      />
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
              {business?.name ?? 'Business workspace'}
            </h2>
            {business ? <StatusBadge status={business.status} /> : null}
          </div>
          <p className="mt-2 text-[var(--text-muted)]">
            Access and actions are scoped to your selected business.
          </p>
        </div>
        <Button>
          <Plus aria-hidden="true" size={18} />
          Issue warranty
        </Button>
      </div>

      <Alert
        className="mt-6"
        tone={business?.status === 'VERIFIED' ? 'success' : 'warning'}
        title={business?.status === 'VERIFIED' ? 'Business verified' : 'Verification required'}
        icon={<BadgeCheck aria-hidden="true" />}
      >
        {business?.status === 'VERIFIED'
          ? 'This workspace can use verified-business operations permitted by your assigned roles.'
          : 'Complete the application before using verified-business operations.'}
      </Alert>

      <section
        aria-label="Business summary"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Active warranties"
          value="1,284"
          detail="12 issued this week"
          icon={<WalletCards aria-hidden="true" />}
        />
        <StatCard
          label="Open claims"
          value="23"
          detail="5 need attention"
          icon={<ClipboardCheck aria-hidden="true" />}
        />
        <StatCard
          label="Products"
          value="48"
          detail="46 currently active"
          icon={<Boxes aria-hidden="true" />}
        />
        <StatCard
          label="Team members"
          value="8"
          detail="Across 5 role profiles"
          icon={<Users aria-hidden="true" />}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Claims needing attention</CardTitle>
            <CardDescription>Queue preview for warranty and support teams.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['WP-CLM-1048', 'Inverter Refrigerator 260L', 'Rahim A.', 'PENDING'],
                  ['WP-CLM-1041', 'Split AC 1.5 Ton', 'Nusrat J.', 'ACTIVE'],
                  ['WP-CLM-1029', 'Microwave Oven 25L', 'Sajib K.', 'COMPLETED'],
                ].map(([reference, product, customer, status]) => (
                  <TableRow key={reference}>
                    <TableCell className="font-mono text-xs font-semibold">{reference}</TableCell>
                    <TableCell className="font-semibold">{product}</TableCell>
                    <TableCell className="text-[var(--text-muted)]">{customer}</TableCell>
                    <TableCell>
                      <StatusBadge status={status as 'PENDING' | 'ACTIVE' | 'COMPLETED'} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Verification & access</CardTitle>
            <CardDescription>Workspace trust controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                [ShieldCheck, 'Business verified', 'Approved 10 Jan 2026'],
                [Users, 'Role-based access', '5 role profiles'],
                [Building2, 'Service centres', '2 active locations'],
                [Wrench, 'Repair operations', 'Foundation ready'],
              ] as const
            ).map(([Icon, title, detail]) => (
              <div key={String(title)} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--primary)]">
                  <Icon aria-hidden="true" size={18} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
                  <p className="text-xs text-[var(--text-subtle)]">{detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  );
}
