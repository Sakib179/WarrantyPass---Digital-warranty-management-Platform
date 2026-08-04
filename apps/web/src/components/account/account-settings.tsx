'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionDto } from '@warrantypass/shared';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  PasswordInput,
  StatusBadge,
} from '@warrantypass/ui';
import {
  changePasswordSchema,
  requestEmailChangeSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type RequestEmailChangeInput,
  type UpdateProfileInput,
} from '@warrantypass/validation';
import { Laptop, LogOut, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from '@/components/auth/auth-provider';
import { apiRequest, ApiClientError } from '@/lib/api-client';

export function AccountSettings(): ReactNode {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const sessions = useQuery({
    queryKey: ['account', 'sessions'],
    queryFn: () => apiRequest<SessionDto[]>('/auth/sessions'),
  });
  const profile = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      fullName: auth.user?.profile.fullName,
      mobileNumber: auth.user?.profile.mobileNumber,
      preferredLanguage: auth.user?.profile.preferredLanguage === 'bn-BD' ? 'bn-BD' : 'en-BD',
    },
  });
  const password = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });
  const email = useForm<RequestEmailChangeInput>({
    resolver: zodResolver(requestEmailChangeSchema),
    defaultValues: { newEmail: '', password: '' },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => apiRequest(`/auth/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] }),
  });

  const showResult = (result: unknown, fallback: string): void => {
    const data = result as { message?: string };
    setMessage(data.message ?? fallback);
  };
  const showError = (error: unknown): void =>
    setMessage(error instanceof ApiClientError ? error.message : 'The change could not be saved.');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 py-10 sm:p-6">
      <header>
        <p className="text-sm font-semibold text-[var(--primary)]">Account centre</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Profile and security</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Manage your personal details, credentials, and signed-in devices.
        </p>
      </header>
      {message ? <Alert title="Account update">{message}</Alert> : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Language support is ready for future Bangla content.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) =>
                void profile.handleSubmit(async (values) => {
                  try {
                    const result = await apiRequest('/account/profile', {
                      method: 'PATCH',
                      body: JSON.stringify(values),
                    });
                    await auth.refreshUser();
                    showResult(result, 'Profile saved.');
                  } catch (error) {
                    showError(error);
                  }
                })(event)
              }
            >
              <FormField
                label="Full name"
                htmlFor="profile-name"
                error={profile.formState.errors.fullName?.message}
              >
                <Input id="profile-name" autoComplete="name" {...profile.register('fullName')} />
              </FormField>
              <FormField
                label="Mobile number"
                htmlFor="profile-mobile"
                error={profile.formState.errors.mobileNumber?.message}
              >
                <Input
                  id="profile-mobile"
                  autoComplete="tel"
                  {...profile.register('mobileNumber')}
                />
              </FormField>
              <Button type="submit" disabled={profile.formState.isSubmitting}>
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Your other sessions are revoked after a password change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) =>
                void password.handleSubmit(async (values) => {
                  try {
                    const result = await apiRequest('/auth/password/change', {
                      method: 'POST',
                      body: JSON.stringify(values),
                    });
                    password.reset();
                    showResult(result, 'Password changed.');
                  } catch (error) {
                    showError(error);
                  }
                })(event)
              }
            >
              <FormField
                label="Current password"
                htmlFor="current-password"
                error={password.formState.errors.currentPassword?.message}
              >
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  {...password.register('currentPassword')}
                />
              </FormField>
              <FormField
                label="New password"
                htmlFor="new-password"
                hint="Use 12–128 characters."
                error={password.formState.errors.password?.message}
              >
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  {...password.register('password')}
                />
              </FormField>
              <FormField
                label="Confirm new password"
                htmlFor="confirm-new-password"
                error={password.formState.errors.confirmPassword?.message}
              >
                <PasswordInput
                  id="confirm-new-password"
                  autoComplete="new-password"
                  {...password.register('confirmPassword')}
                />
              </FormField>
              <Button type="submit" disabled={password.formState.isSubmitting}>
                Change password
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Email address</CardTitle>
            <CardDescription>Current email: {auth.user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) =>
                void email.handleSubmit(async (values) => {
                  try {
                    const result = await apiRequest('/account/email/change', {
                      method: 'POST',
                      body: JSON.stringify(values),
                    });
                    email.reset();
                    showResult(result, 'Check the new inbox to confirm the change.');
                  } catch (error) {
                    showError(error);
                  }
                })(event)
              }
            >
              <FormField
                label="New email"
                htmlFor="new-email"
                error={email.formState.errors.newEmail?.message}
              >
                <Input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  {...email.register('newEmail')}
                />
              </FormField>
              <FormField
                label="Current password"
                htmlFor="email-password"
                error={email.formState.errors.password?.message}
              >
                <PasswordInput
                  id="email-password"
                  autoComplete="current-password"
                  {...email.register('password')}
                />
              </FormField>
              <Button type="submit" disabled={email.formState.isSubmitting}>
                Send confirmation
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active sessions</CardTitle>
            <CardDescription>Revoke devices you no longer recognize.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.isPending ? <p>Loading secure sessions…</p> : null}
            {sessions.isError ? (
              <Alert tone="danger" title="Sessions unavailable">
                Try again shortly.
              </Alert>
            ) : null}
            {sessions.data?.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Laptop aria-hidden="true" className="shrink-0 text-[var(--primary)]" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{session.deviceName}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {session.ipHint ?? 'IP unavailable'} · {session.browser ?? 'Unknown browser'}
                    </p>
                  </div>
                </div>
                {session.current ? (
                  <StatusBadge status="ACTIVE" />
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => revoke.mutate(session.id)}>
                    Revoke
                  </Button>
                )}
              </div>
            ))}
            <Button variant="secondary" onClick={() => void auth.logoutAll()}>
              <LogOut aria-hidden="true" size={17} /> Sign out everywhere
            </Button>
            <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <ShieldCheck aria-hidden="true" size={15} /> Device details are security hints, not
              precise tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
