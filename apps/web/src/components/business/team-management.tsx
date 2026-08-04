'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BUSINESS_PERMISSIONS,
  type BusinessInvitationDto,
  type BusinessMemberDto,
  type BusinessRoleDto,
} from '@warrantypass/shared';
import {
  Alert,
  Badge,
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
} from '@warrantypass/ui';
import { MailPlus, ShieldCheck, Users } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { businessNavigation } from '@/components/business/business-navigation';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { apiRequest, ApiClientError } from '@/lib/api-client';

export function TeamManagement({ view }: { view: 'members' | 'roles' }): ReactNode {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const current = auth.user?.businesses.find((item) => item.isCurrent) ?? auth.user?.businesses[0];
  const permissions = new Set(current?.permissions ?? []);
  const members = useQuery({
    queryKey: ['business', 'members'],
    queryFn: () => apiRequest<BusinessMemberDto[]>('/business/members'),
    enabled: view === 'members',
  });
  const invitations = useQuery({
    queryKey: ['business', 'invitations'],
    queryFn: () => apiRequest<BusinessInvitationDto[]>('/business/invitations'),
    enabled: view === 'members',
  });
  const roles = useQuery({
    queryKey: ['business', 'roles'],
    queryFn: () => apiRequest<BusinessRoleDto[]>('/business/roles'),
  });
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const invite = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      await apiRequest('/business/invitations', {
        method: 'POST',
        body: JSON.stringify({ email, roleId, expiresInDays: 7 }),
      });
      setEmail('');
      setMessage('Invitation sent. The link is email-bound and expires in seven days.');
      await queryClient.invalidateQueries({ queryKey: ['business', 'invitations'] });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : 'Invitation failed.');
    }
  };
  const createRole = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      await apiRequest('/business/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: roleName,
          description: 'Custom workspace role',
          permissions: [BUSINESS_PERMISSIONS.MEMBERS_VIEW],
        }),
      });
      setRoleName('');
      setMessage('Custom role created with least-privilege member viewing.');
      await queryClient.invalidateQueries({ queryKey: ['business', 'roles'] });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : 'Role creation failed.');
    }
  };

  return (
    <ProtectedRoute context="business">
      <DashboardShell
        title={view === 'members' ? 'Members and invitations' : 'Roles and permissions'}
        activeHref={view === 'members' ? '/business/members' : '/business/roles'}
        items={businessNavigation}
      >
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Access control</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {view === 'members' ? 'Team workspace' : 'Role administration'}
          </h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Permissions are resolved on the server for the selected business, never trusted from the
            browser.
          </p>
        </div>
        {message ? (
          <Alert className="mt-6" title="Access update">
            {message}
          </Alert>
        ) : null}
        {view === 'members' ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>People with current or historical access.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {members.data?.length ? (
                  members.data.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-[var(--text-muted)]">{member.email}</p>
                        <p className="mt-1 text-xs">
                          {member.roles.map((role) => role.name).join(', ') || 'No role'}
                        </p>
                      </div>
                      <StatusBadge status={member.status} />
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="No members found"
                    description="Invite a colleague after your business is verified."
                    icon={<Users aria-hidden="true" />}
                  />
                )}
              </CardContent>
            </Card>
            <div className="space-y-6">
              {permissions.has(BUSINESS_PERMISSIONS.MEMBERS_INVITE) ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Invite a member</CardTitle>
                    <CardDescription>
                      Invitations are single-use and tied to the recipient email.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={(event) => void invite(event)}>
                      <FormField label="Work email" htmlFor="invite-email">
                        <Input
                          id="invite-email"
                          type="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                      </FormField>
                      <FormField label="Initial role" htmlFor="invite-role">
                        <select
                          id="invite-role"
                          required
                          value={roleId}
                          onChange={(event) => setRoleId(event.target.value)}
                          className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
                        >
                          <option value="">Choose a role</option>
                          {roles.data?.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <Button type="submit">
                        <MailPlus aria-hidden="true" size={17} /> Send invitation
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle>Pending invitations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {invitations.data?.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="rounded-xl border border-[var(--border)] p-3"
                    >
                      <p className="font-semibold">{invitation.email}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {invitation.role.name} · expires{' '}
                        {new Date(invitation.expiresAt).toLocaleDateString('en-BD')}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
            <Card>
              <CardHeader>
                <CardTitle>Workspace roles</CardTitle>
                <CardDescription>
                  System roles are protected; custom roles can evolve with the business.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {roles.data?.map((role) => (
                  <div key={role.id} className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{role.name}</p>
                      {role.isSystem ? (
                        <Badge tone="success">System role</Badge>
                      ) : (
                        <Badge>Custom role</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      {role.description ?? 'No description'} · {role.memberCount} member(s)
                    </p>
                    <p className="mt-3 text-xs">{role.permissions.join(' · ')}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            {permissions.has(BUSINESS_PERMISSIONS.ROLES_CREATE) ? (
              <Card>
                <CardHeader>
                  <CardTitle>Create custom role</CardTitle>
                  <CardDescription>
                    Starts with only “members.view”; edit through the API as policies expand.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={(event) => void createRole(event)}>
                    <FormField label="Role name" htmlFor="role-name">
                      <Input
                        id="role-name"
                        required
                        value={roleName}
                        onChange={(event) => setRoleName(event.target.value)}
                      />
                    </FormField>
                    <Button type="submit">
                      <ShieldCheck aria-hidden="true" size={17} /> Create least-privilege role
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </DashboardShell>
    </ProtectedRoute>
  );
}
