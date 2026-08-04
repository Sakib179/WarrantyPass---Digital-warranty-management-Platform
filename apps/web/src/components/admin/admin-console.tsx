'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuditLogDto,
  PlatformDashboardDto,
  VerificationQueueItemDto,
} from '@warrantypass/shared';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  FormField,
  Input,
  StatusBadge,
  Textarea,
} from '@warrantypass/ui';
import {
  Activity,
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  Search,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { StatCard } from '@/components/dashboard/stat-card';
import { apiRequest, ApiClientError, downloadPrivateFile } from '@/lib/api-client';

const adminNavigation = [
  { label: 'Overview', href: '/admin', icon: <LayoutDashboard aria-hidden="true" size={19} /> },
  {
    label: 'Verification queue',
    href: '/admin/verifications',
    icon: <ClipboardCheck aria-hidden="true" size={19} />,
  },
  {
    label: 'Businesses',
    href: '/admin/businesses',
    icon: <Building2 aria-hidden="true" size={19} />,
  },
  {
    label: 'Audit logs',
    href: '/admin/audit-logs',
    icon: <Activity aria-hidden="true" size={19} />,
  },
  { label: 'User lookup', href: '/admin/users', icon: <Search aria-hidden="true" size={19} /> },
];

export function AdminDashboard(): ReactNode {
  const dashboard = useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: () => apiRequest<PlatformDashboardDto>('/platform/dashboard'),
  });
  const data = dashboard.data;
  return (
    <ProtectedRoute context="platform">
      <DashboardShell title="Platform administration" activeHref="/admin" items={adminNavigation}>
        <p className="text-sm font-semibold text-[var(--primary)]">Restricted platform area</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Operations overview</h1>
        <Alert
          className="mt-6"
          tone="warning"
          title="High-impact actions are audited"
          icon={<ShieldAlert aria-hidden="true" />}
        >
          Business decisions require explicit platform permissions and write immutable audit events.
        </Alert>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Pending applications"
            value={String(data?.pendingApplications ?? '—')}
            detail="Waiting for review"
            icon={<ClipboardCheck aria-hidden="true" />}
          />
          <StatCard
            label="In review"
            value={String(data?.applicationsInReview ?? '—')}
            detail="Claimed by reviewers"
            icon={<Activity aria-hidden="true" />}
          />
          <StatCard
            label="More information"
            value={String(data?.moreInformationRequests ?? '—')}
            detail="Returned to applicants"
            icon={<Building2 aria-hidden="true" />}
          />
          <StatCard
            label="Verified businesses"
            value={String(data?.verifiedBusinesses ?? '—')}
            detail="Trusted issuers"
            icon={<Building2 aria-hidden="true" />}
          />
          <StatCard
            label="Suspended businesses"
            value={String(data?.suspendedBusinesses ?? '—')}
            detail="Issuance disabled"
            icon={<ShieldAlert aria-hidden="true" />}
          />
          <StatCard
            label="Security events (24h)"
            value={String(data?.recentSecurityEvents ?? '—')}
            detail="Review audit log"
            icon={<Activity aria-hidden="true" />}
          />
        </section>
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function VerificationQueue({ status }: { status?: string }): ReactNode {
  const path = status
    ? `/platform/businesses?status=${encodeURIComponent(status)}`
    : '/platform/businesses';
  const queue = useQuery({
    queryKey: ['platform', 'businesses', status ?? 'review'],
    queryFn: () => apiRequest<VerificationQueueItemDto[]>(path),
  });
  return (
    <ProtectedRoute context="platform">
      <DashboardShell
        title="Business verification queue"
        activeHref="/admin/verifications"
        items={adminNavigation}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Verification queue</h1>
            <p className="mt-2 text-[var(--text-muted)]">
              Oldest eligible applications are surfaced first.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['Review queue', '/admin/verifications'],
                ['Verified', '/admin/businesses/verified'],
                ['Rejected', '/admin/businesses/rejected'],
                ['Suspended', '/admin/businesses/suspended'],
              ] as const
            ).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
        <Card className="mt-6">
          <CardContent className="space-y-3 pt-6">
            {queue.isError ? (
              <Alert tone="danger" title="Queue unavailable">
                The request could not be completed.
              </Alert>
            ) : null}
            {queue.data?.length ? (
              queue.data.map((business) => (
                <Link
                  key={business.businessId}
                  href={`/admin/businesses/${business.businessId}`}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--border)] p-4 hover:bg-[var(--surface-muted)] sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{business.displayName}</p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {business.legalName} · {business.referenceNumber ?? 'No reference'}
                    </p>
                    {business.duplicateIdentifierFlag ? (
                      <p className="mt-1 text-xs font-semibold text-[var(--danger)]">
                        Possible duplicate identifier
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)]">
                      {business.claimedBy ?? 'Unclaimed'}
                    </span>
                    <StatusBadge status={business.status} />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No matching applications"
                description="The queue is clear for this status."
                icon={<ClipboardCheck aria-hidden="true" />}
              />
            )}
          </CardContent>
        </Card>
      </DashboardShell>
    </ProtectedRoute>
  );
}

interface ReviewDetail {
  id: string;
  name: string;
  legalName: string | null;
  status: string;
  statusVersion: number;
  referenceNumber: string | null;
  duplicateIdentifierFlag: boolean;
  identifiers: { tradeLicenseNumber: string | null; binNumber: string | null };
  revisions: Array<{
    id: string;
    version: number;
    submittedAt: string | null;
    fields: Record<string, string | null>;
    documents: Array<{ id: string; displayName: string; kind: string; scanStatus: string }>;
  }>;
  history: Array<{
    id: string;
    newStatus: string;
    internalNote: string | null;
    userVisibleReason: string | null;
    reviewer: string | null;
    createdAt: string;
  }>;
}

export function VerificationDetail({ businessId }: { businessId: string }): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ['platform', 'business', businessId],
    queryFn: () => apiRequest<ReviewDetail>(`/platform/businesses/${businessId}`),
  });
  const [publicReason, setPublicReason] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const act = async (
    action: 'claim' | 'approve' | 'more-information' | 'reject' | 'suspend' | 'restore',
  ): Promise<void> => {
    const body =
      action === 'approve'
        ? { reviewerNote: internalNote || 'Approved after document review.' }
        : action === 'claim' || action === 'restore'
          ? { internalNote: internalNote || 'Review started.' }
          : action === 'reject'
            ? { category: 'DOCUMENT_MISMATCH', userVisibleReason: publicReason, internalNote }
            : { userVisibleReason: publicReason, internalNote };
    try {
      const result = await apiRequest<{ message: string }>(
        `/platform/businesses/${businessId}/${action}`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      setMessage(result.message);
      await queryClient.invalidateQueries({ queryKey: ['platform'] });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : 'Decision failed.');
    }
  };
  const data = detail.data;
  return (
    <ProtectedRoute context="platform">
      <DashboardShell
        title="Verification review"
        activeHref="/admin/verifications"
        items={adminNavigation}
      >
        <Button variant="ghost" onClick={() => router.push('/admin/verifications')}>
          ← Back to queue
        </Button>
        {message ? (
          <Alert className="mt-4" title="Review update">
            {message}
          </Alert>
        ) : null}
        {data ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{data.name}</h1>
              <StatusBadge status={data.status as 'PENDING'} />
            </div>
            <p className="mt-2 text-[var(--text-muted)]">
              {data.referenceNumber ?? 'No reference'} · Trade Licence{' '}
              {data.identifiers.tradeLicenseNumber ?? 'missing'}
            </p>
            {data.duplicateIdentifierFlag ? (
              <Alert className="mt-5" tone="danger" title="Duplicate check requires attention">
                Another business has a matching registered identifier.
              </Alert>
            ) : null}
            <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
              <div className="space-y-6">
                {data.revisions.map((revision) => (
                  <Card key={revision.id}>
                    <CardHeader>
                      <CardTitle>Submission revision {revision.version}</CardTitle>
                      <CardDescription>
                        {revision.submittedAt
                          ? new Date(revision.submittedAt).toLocaleString('en-BD')
                          : 'Draft'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(revision.fields).map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between gap-4 border-b border-[var(--border)] pb-2 text-sm"
                        >
                          <span className="text-[var(--text-subtle)]">{label}</span>
                          <span className="text-right font-semibold">{value ?? '—'}</span>
                        </div>
                      ))}
                      <h3 className="pt-2 font-semibold">Private documents</h3>
                      {revision.documents.map((document) => (
                        <button
                          type="button"
                          key={document.id}
                          onClick={() =>
                            void downloadPrivateFile(
                              `/platform/businesses/${businessId}/documents/${document.id}`,
                              document.displayName,
                            )
                          }
                          className="block rounded-lg border border-[var(--border)] p-3 text-sm font-semibold hover:bg-[var(--surface-muted)]"
                        >
                          {document.displayName} · {document.kind} · {document.scanStatus}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Reviewer decision</CardTitle>
                    <CardDescription>
                      Public reasons are emailed to the applicant. Internal notes never leave the
                      platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField label="Applicant-visible reason" htmlFor="public-reason">
                      <Textarea
                        id="public-reason"
                        value={publicReason}
                        onChange={(event) => setPublicReason(event.target.value)}
                      />
                    </FormField>
                    <FormField label="Internal reviewer note" htmlFor="internal-note">
                      <Textarea
                        id="internal-note"
                        value={internalNote}
                        onChange={(event) => setInternalNote(event.target.value)}
                      />
                    </FormField>
                    <div className="flex flex-wrap gap-2">
                      {data.status === 'PENDING' ? (
                        <Button onClick={() => void act('claim')}>Claim review</Button>
                      ) : null}
                      {data.status === 'IN_REVIEW' ? (
                        <>
                          <Button onClick={() => void act('approve')}>Approve</Button>
                          <Button variant="secondary" onClick={() => void act('more-information')}>
                            Request information
                          </Button>
                          <Button variant="danger" onClick={() => void act('reject')}>
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {data.status === 'VERIFIED' ? (
                        <Button variant="danger" onClick={() => void act('suspend')}>
                          Suspend
                        </Button>
                      ) : null}
                      {data.status === 'SUSPENDED' ? (
                        <Button onClick={() => void act('restore')}>Restore</Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Review history</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.history.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-[var(--border)] p-3 text-sm"
                      >
                        <p className="font-semibold">{item.newStatus.replaceAll('_', ' ')}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.reviewer ?? 'System'} ·{' '}
                          {new Date(item.createdAt).toLocaleString('en-BD')}
                        </p>
                        {item.internalNote ? (
                          <p className="mt-2">Internal: {item.internalNote}</p>
                        ) : null}
                        {item.userVisibleReason ? (
                          <p className="mt-1">Public: {item.userVisibleReason}</p>
                        ) : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-8">Loading private application…</p>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}

export function AuditLog(): ReactNode {
  const logs = useQuery({
    queryKey: ['platform', 'audit'],
    queryFn: () => apiRequest<AuditLogDto[]>('/platform/audit-logs?page=1&pageSize=50'),
  });
  return (
    <ProtectedRoute context="platform">
      <DashboardShell
        title="Platform audit log"
        activeHref="/admin/audit-logs"
        items={adminNavigation}
      >
        <h1 className="text-3xl font-bold">Audit log</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Security and administrative actions with request correlation.
        </p>
        <Card className="mt-6">
          <CardContent className="space-y-2 pt-6">
            {logs.data?.map((log) => (
              <div
                key={log.id}
                className="grid gap-1 rounded-xl border border-[var(--border)] p-3 text-sm sm:grid-cols-[1.1fr_1fr_1fr]"
              >
                <span className="font-semibold">{log.action}</span>
                <span>{log.actorEmail ?? 'System'}</span>
                <span className="text-[var(--text-muted)]">
                  {new Date(log.createdAt).toLocaleString('en-BD')} ·{' '}
                  {log.requestId ?? 'no request id'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </DashboardShell>
    </ProtectedRoute>
  );
}

interface UserLookupResult {
  id: string;
  email: string;
  name: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  emailVerified: boolean;
  memberships: number;
  sessions: number;
  createdAt: string;
}

export function UserLookup(): ReactNode {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const users = useQuery({
    queryKey: ['platform', 'users', search],
    queryFn: () =>
      apiRequest<UserLookupResult[]>(`/platform/users?search=${encodeURIComponent(search)}`),
    enabled: search.length >= 2,
  });
  return (
    <ProtectedRoute context="platform">
      <DashboardShell
        title="Restricted user lookup"
        activeHref="/admin/users"
        items={adminNavigation}
      >
        <h1 className="text-3xl font-bold">User lookup</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Search by exact or partial email/name. Access is protected by a dedicated platform
          permission.
        </p>
        <form
          className="mt-6 flex max-w-2xl gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (input.trim().length >= 2) setSearch(input.trim());
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-label="Search users"
            placeholder="Email address or name"
            minLength={2}
            required
          />
          <Button type="submit">
            <Search aria-hidden="true" size={17} /> Search
          </Button>
        </form>
        <Card className="mt-6">
          <CardContent className="space-y-3 pt-6">
            {users.isError ? (
              <Alert tone="danger" title="Search unavailable">
                The lookup could not be completed.
              </Alert>
            ) : null}
            {users.data?.map((user) => (
              <div
                key={user.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-semibold">{user.name ?? 'Name not provided'}</p>
                  <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                  <p className="mt-1 text-xs">
                    {user.memberships} business membership(s) · {user.sessions} session(s) ·{' '}
                    {user.emailVerified ? 'email verified' : 'email unverified'}
                  </p>
                </div>
                <StatusBadge status={user.status} />
              </div>
            ))}
            {search && users.data?.length === 0 ? (
              <EmptyState
                title="No matching users"
                description="Try a different email address or name."
                icon={<Search aria-hidden="true" />}
              />
            ) : null}
          </CardContent>
        </Card>
      </DashboardShell>
    </ProtectedRoute>
  );
}
