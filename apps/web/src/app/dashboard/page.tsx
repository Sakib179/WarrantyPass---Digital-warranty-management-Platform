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
  EmptyState,
  SearchInput,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@warrantypass/ui';
import {
  BellRing,
  CircleHelp,
  FilePlus2,
  FolderClock,
  LayoutDashboard,
  Plus,
  Settings,
  ShieldCheck,
  WalletCards,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatCard } from '@/components/dashboard/stat-card';

const navigation = [
  { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard aria-hidden="true" size={19} /> },
  { label: 'Warranty wallet', href: '#wallet', icon: <WalletCards aria-hidden="true" size={19} /> },
  { label: 'Manual vault', href: '#vault', icon: <FolderClock aria-hidden="true" size={19} /> },
  { label: 'Claims', href: '#claims', icon: <CircleHelp aria-hidden="true" size={19} /> },
  { label: 'Repairs', href: '#repairs', icon: <Wrench aria-hidden="true" size={19} /> },
  {
    label: 'Notifications',
    href: '#notifications',
    icon: <BellRing aria-hidden="true" size={19} />,
  },
  { label: 'Settings', href: '#settings', icon: <Settings aria-hidden="true" size={19} /> },
];

const warranties = [
  {
    product: 'Inverter Refrigerator 260L',
    issuer: 'Dhaka Appliances',
    expires: '15 Jan 2028',
    status: 'VERIFIED' as const,
  },
  {
    product: 'Wireless Headphones',
    issuer: 'Personal record',
    expires: '01 Feb 2027',
    status: 'USER_UPLOADED' as const,
  },
];

export default function CustomerDashboardPage(): ReactNode {
  const auth = useAuth();
  const firstName = auth.user?.profile.fullName?.split(' ')[0] ?? 'there';
  return (
    <DashboardShell title="Customer dashboard" activeHref="/dashboard" items={navigation}>
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Overview', href: '/dashboard' },
        ]}
      />
      <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">
            Good morning, {firstName}
          </h2>
          <p className="mt-2 text-[var(--text-muted)]">
            Your secure digital warranty wallet is ready.
          </p>
        </div>
        <Button>
          <Plus aria-hidden="true" size={18} />
          Add manual warranty
        </Button>
      </div>

      <Alert
        className="mt-6"
        tone="info"
        title="Warranty provenance stays visible"
        icon={<ShieldCheck aria-hidden="true" />}
      >
        Business-issued and user-uploaded records always remain clearly distinguished.
      </Alert>

      <section
        aria-label="Warranty summary"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Active warranties"
          value="2"
          detail="Across 2 products"
          icon={<WalletCards aria-hidden="true" />}
        />
        <StatCard
          label="Business verified"
          value="1"
          detail="Issued by a verified business"
          icon={<ShieldCheck aria-hidden="true" />}
        />
        <StatCard
          label="Expiring soon"
          value="0"
          detail="Next 60 days"
          icon={<FolderClock aria-hidden="true" />}
        />
        <StatCard
          label="Open claims"
          value="0"
          detail="Nothing needs attention"
          icon={<CircleHelp aria-hidden="true" />}
        />
      </section>

      <section id="wallet" className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_0.75fr]">
        <Card className="min-w-0">
          <CardHeader className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Recent warranties</CardTitle>
              <CardDescription>
                Verified and personal records remain visibly different.
              </CardDescription>
            </div>
            <SearchInput
              className="sm:w-64"
              aria-label="Search warranties"
              placeholder="Search warranties"
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warranties.map((warranty) => (
                  <TableRow key={warranty.product}>
                    <TableCell className="font-semibold">{warranty.product}</TableCell>
                    <TableCell className="text-[var(--text-muted)]">{warranty.issuer}</TableCell>
                    <TableCell className="whitespace-nowrap">{warranty.expires}</TableCell>
                    <TableCell>
                      <StatusBadge status={warranty.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Claims and service</CardTitle>
            <CardDescription>Items needing your response will appear here.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No open claims"
              description="When claims are available in a later phase, their current status will be shown here."
              icon={<FilePlus2 aria-hidden="true" />}
            />
          </CardContent>
        </Card>
      </section>
    </DashboardShell>
  );
}
