'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, FormField, Input, PasswordInput } from '@warrantypass/ui';
import {
  emailResendSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@warrantypass/validation';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { PasswordStrength } from './password-strength';
import { apiRequest, ApiClientError } from '@/lib/api-client';

export function ForgotPasswordForm(): ReactNode {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });
  const submit = async (values: { email: string }): Promise<void> => {
    try {
      const result = await apiRequest<{ message: string }>('/auth/password/forgot', {
        method: 'POST',
        body: JSON.stringify(values),
        retryAuthentication: false,
      });
      setMessage(result.message);
    } catch {
      setMessage(
        'If an eligible account matches that email, a recovery message will arrive shortly.',
      );
    }
  };
  if (message)
    return (
      <Alert title="Check your email" tone="success">
        {message}
      </Alert>
    );
  return (
    <form onSubmit={(event) => void form.handleSubmit(submit)(event)} className="space-y-5">
      <FormField
        label="Email address"
        htmlFor="email"
        required
        error={form.formState.errors.email?.message}
      >
        <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
      </FormField>
      <Button type="submit" fullWidth disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Requesting…' : 'Send reset link'}
      </Button>
    </form>
  );
}

export function ResendVerificationForm({
  defaultEmail = '',
}: {
  defaultEmail?: string;
}): ReactNode {
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(emailResendSchema),
    defaultValues: { email: defaultEmail },
  });
  const submit = async (values: { email: string }): Promise<void> => {
    const result = await apiRequest<{ message: string }>('/auth/email/resend', {
      method: 'POST',
      body: JSON.stringify(values),
      retryAuthentication: false,
    });
    setMessage(result.message);
  };
  return (
    <form onSubmit={(event) => void form.handleSubmit(submit)(event)} className="space-y-4">
      {message ? (
        <Alert title="Request received" tone="success">
          {message}
        </Alert>
      ) : null}
      <FormField
        label="Email address"
        htmlFor="resend-email"
        required
        error={form.formState.errors.email?.message}
      >
        <Input id="resend-email" type="email" {...form.register('email')} />
      </FormField>
      <Button type="submit" variant="secondary" disabled={form.formState.isSubmitting}>
        Resend verification email
      </Button>
    </form>
  );
}

export function ResetPasswordForm(): ReactNode {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: searchParams.get('token') ?? '',
      password: '',
      confirmPassword: '',
    },
  });
  const password = useWatch({ control: form.control, name: 'password' });
  const submit = async (values: {
    token: string;
    password: string;
    confirmPassword: string;
  }): Promise<void> => {
    setError(null);
    try {
      await apiRequest('/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify(values),
        retryAuthentication: false,
      });
      router.replace('/login?reset=success');
    } catch (caught) {
      setError(
        caught instanceof ApiClientError ? caught.message : 'The password could not be reset.',
      );
    }
  };
  return (
    <form onSubmit={(event) => void form.handleSubmit(submit)(event)} className="space-y-5">
      {error ? (
        <Alert title="Reset unsuccessful" tone="danger">
          {error}
        </Alert>
      ) : null}
      <input type="hidden" {...form.register('token')} />
      <FormField
        label="New password"
        htmlFor="password"
        required
        error={form.formState.errors.password?.message}
      >
        <PasswordInput id="password" autoComplete="new-password" {...form.register('password')} />
        <PasswordStrength password={password} />
      </FormField>
      <FormField
        label="Confirm password"
        htmlFor="confirmPassword"
        required
        error={form.formState.errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          {...form.register('confirmPassword')}
        />
      </FormField>
      <Button type="submit" fullWidth disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}
