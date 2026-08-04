'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, FormField, Input, PasswordInput } from '@warrantypass/ui';
import { loginSchema, type LoginInput } from '@warrantypass/validation';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';

import { useAuth } from './auth-provider';
import { ApiClientError } from '@/lib/api-client';

export function LoginForm({ accountType }: { accountType: 'customer' | 'business' }): ReactNode {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (values: LoginInput): Promise<void> => {
    setFormError(null);
    try {
      const authentication = await auth.login({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe ?? false,
      });
      const requested = searchParams.get('returnTo');
      const safeReturnTo =
        requested?.startsWith('/') && !requested.startsWith('//') ? requested : null;
      router.replace(safeReturnTo ?? authentication.redirectTo);
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : 'WarrantyPass could not sign you in. Please try again.',
      );
    }
  };

  const registerHref = accountType === 'customer' ? '/register' : '/business/register';
  const alternativeHref = accountType === 'customer' ? '/business/login' : '/login';

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="space-y-5">
      {formError ? (
        <Alert title="Sign-in unsuccessful" tone="danger">
          {formError}
        </Alert>
      ) : null}
      <FormField
        label={accountType === 'business' ? 'Business or employee email' : 'Email address'}
        htmlFor="email"
        required
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="name@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </FormField>
      <FormField label="Password" htmlFor="password" required error={errors.password?.message}>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
      </FormField>
      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="inline-flex items-center gap-2 text-[var(--text-muted)]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            {...register('rememberMe')}
          />
          Remember this device
        </label>
        <Link
          href="/forgot-password"
          className="font-semibold text-[var(--primary)] hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
        {isSubmitting
          ? 'Signing in…'
          : accountType === 'business'
            ? 'Sign in to business workspace'
            : 'Sign in to WarrantyPass'}
      </Button>
      <p className="text-center text-sm text-[var(--text-muted)]">
        New to WarrantyPass?{' '}
        <Link href={registerHref} className="font-semibold text-[var(--primary)] hover:underline">
          {accountType === 'business' ? 'Apply for a business account' : 'Create an account'}
        </Link>
      </p>
      <p className="text-center">
        <Link
          href={alternativeHref}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--primary)]"
        >
          {accountType === 'business' ? 'Use customer sign in' : 'Use business sign in'}
        </Link>
      </p>
    </form>
  );
}
