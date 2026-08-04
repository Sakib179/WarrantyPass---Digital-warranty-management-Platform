'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, FormField, Input, PasswordInput } from '@warrantypass/ui';
import {
  customerRegistrationSchema,
  type CustomerRegistrationInput,
} from '@warrantypass/validation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { PasswordStrength } from './password-strength';
import { apiRequest, ApiClientError } from '@/lib/api-client';

export function CustomerRegistrationForm(): ReactNode {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CustomerRegistrationInput>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      mobileNumber: '',
      preferredLanguage: 'en-BD',
      acceptedTerms: false,
      acceptedPrivacy: false,
    },
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = async (values: CustomerRegistrationInput): Promise<void> => {
    setFormError(null);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
        retryAuthentication: false,
      });
      router.push(`/check-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : 'The account could not be created. Please try again.',
      );
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate className="space-y-5">
      {formError ? (
        <Alert title="Account not created" tone="danger">
          {formError}
        </Alert>
      ) : null}
      <FormField label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="name" {...register('fullName')} />
      </FormField>
      <FormField label="Email address" htmlFor="email" required error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
      </FormField>
      <FormField
        label="Create password"
        htmlFor="password"
        required
        hint="Use 12–128 characters. A memorable multi-word passphrase works well."
        error={errors.password?.message}
      >
        <PasswordInput
          id="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        <PasswordStrength password={password ?? ''} />
      </FormField>
      <FormField
        label="Confirm password"
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword?.message}
      >
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
      </FormField>
      {(
        [
          ['acceptedTerms', 'I accept the WarrantyPass Terms of Service.'],
          ['acceptedPrivacy', 'I accept the Privacy Policy and document-handling terms.'],
        ] as const
      ).map(([field, label]) => (
        <div key={field}>
          <label className="flex items-start gap-3 text-sm leading-6 text-[var(--text-muted)]">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-[var(--primary)]"
              {...register(field)}
            />
            <span>{label}</span>
          </label>
          {errors[field] ? (
            <p role="alert" className="mt-1 text-sm text-[var(--danger)]">
              {errors[field]?.message}
            </p>
          ) : null}
        </div>
      ))}
      <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create free account'}
      </Button>
      <p className="text-center text-sm text-[var(--text-muted)]">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
