'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  PasswordInput,
  Select,
  Textarea,
} from '@warrantypass/ui';
import {
  businessRegistrationSchema,
  type BusinessRegistrationInput,
} from '@warrantypass/validation';
import { Check, ChevronLeft, ChevronRight, FileLock2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useForm, useWatch, type FieldErrors, type FieldPath } from 'react-hook-form';

import { PasswordStrength } from './password-strength';
import { apiRequest, ApiClientError } from '@/lib/api-client';

const steps = [
  { title: 'Account', fields: ['ownerFullName', 'businessEmail', 'password', 'confirmPassword'] },
  {
    title: 'Business identity',
    fields: [
      'legalName',
      'displayName',
      'businessType',
      'tradeLicenseNumber',
      'binNumber',
      'yearEstablished',
    ],
  },
  {
    title: 'Contact',
    fields: ['phone', 'website', 'addressLine', 'area', 'district', 'division', 'postalCode'],
  },
  { title: 'Documents', fields: [] },
  { title: 'Review', fields: ['acceptedTerms', 'acceptedPrivacy'] },
] as const;

export function BusinessRegistrationForm(): ReactNode {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [documents, setDocuments] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BusinessRegistrationInput>({
    resolver: zodResolver(businessRegistrationSchema),
    defaultValues: {
      ownerFullName: '',
      businessEmail: '',
      password: '',
      confirmPassword: '',
      legalName: '',
      displayName: '',
      businessType: '',
      tradeLicenseNumber: '',
      binNumber: '',
      phone: '',
      website: '',
      addressLine: '',
      area: '',
      district: '',
      division: '',
      postalCode: '',
      acceptedTerms: false,
      acceptedPrivacy: false,
    },
  });
  const values = useWatch({ control });

  const next = async (): Promise<void> => {
    const fields = (steps[step]?.fields ?? []) as readonly FieldPath<BusinessRegistrationInput>[];
    const valid = await trigger([...fields]);
    if (valid) setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const submit = async (input: BusinessRegistrationInput): Promise<void> => {
    setFormError(null);
    try {
      await apiRequest('/auth/register/business', {
        method: 'POST',
        body: JSON.stringify(input),
        retryAuthentication: false,
      });
      router.push(`/check-email?email=${encodeURIComponent(input.businessEmail)}&business=1`);
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : 'The business draft could not be created. Please try again.',
      );
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(submit)(event)} noValidate className="space-y-6">
      <ol aria-label="Business application steps" className="grid grid-cols-5 gap-2">
        {steps.map((item, index) => (
          <li key={item.title} aria-current={index === step ? 'step' : undefined}>
            <div
              className={`h-1.5 rounded-full ${
                index <= step ? 'bg-[var(--primary)]' : 'bg-[var(--surface-emphasis)]'
              }`}
            />
            <span className="mt-2 hidden text-xs font-semibold text-[var(--text-muted)] sm:block">
              {item.title}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-[var(--primary)]">
        Step {step + 1} of {steps.length}: {steps[step]?.title}
      </p>
      {formError ? (
        <Alert title="Application not saved" tone="danger">
          {formError}
        </Alert>
      ) : null}

      {step === 0 ? (
        <div className="space-y-5">
          <Field label="Owner’s full name" name="ownerFullName" errors={errors}>
            <Input id="ownerFullName" required autoComplete="name" {...register('ownerFullName')} />
          </Field>
          <Field label="Business email" name="businessEmail" errors={errors}>
            <Input
              id="businessEmail"
              required
              type="email"
              autoComplete="email"
              {...register('businessEmail')}
            />
          </Field>
          <Field
            label="Create password"
            name="password"
            errors={errors}
            hint="Use at least 12 characters. Passphrases are supported."
          >
            <PasswordInput
              id="password"
              required
              autoComplete="new-password"
              {...register('password')}
            />
            <PasswordStrength password={values.password ?? ''} />
          </Field>
          <Field label="Confirm password" name="confirmPassword" errors={errors}>
            <PasswordInput
              id="confirmPassword"
              required
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Legal business name" name="legalName" errors={errors}>
            <Input id="legalName" required {...register('legalName')} />
          </Field>
          <Field label="Public display name" name="displayName" errors={errors}>
            <Input id="displayName" required {...register('displayName')} />
          </Field>
          <Field label="Business type" name="businessType" errors={errors}>
            <Select id="businessType" required {...register('businessType')}>
              <option value="">Choose a type</option>
              <option>Retailer</option>
              <option>Distributor</option>
              <option>Manufacturer</option>
              <option>Service Center</option>
              <option>Other</option>
            </Select>
          </Field>
          <Field label="Year established" name="yearEstablished" errors={errors} required={false}>
            <Input
              id="yearEstablished"
              type="number"
              min="1800"
              max="2200"
              {...register('yearEstablished')}
            />
          </Field>
          <Field label="Trade Licence Number" name="tradeLicenseNumber" errors={errors}>
            <Input id="tradeLicenseNumber" required {...register('tradeLicenseNumber')} />
          </Field>
          <Field label="BIN" name="binNumber" errors={errors} required={false}>
            <Input id="binNumber" {...register('binNumber')} />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business phone" name="phone" errors={errors}>
            <Input id="phone" required type="tel" {...register('phone')} />
          </Field>
          <Field label="Website" name="website" errors={errors} required={false}>
            <Input id="website" type="url" placeholder="https://" {...register('website')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address line" name="addressLine" errors={errors}>
              <Textarea id="addressLine" required rows={3} {...register('addressLine')} />
            </Field>
          </div>
          {(['area', 'district', 'division', 'postalCode'] as const).map((name) => (
            <Field
              key={name}
              label={
                {
                  area: 'Area',
                  district: 'District',
                  division: 'Division',
                  postalCode: 'Postal code',
                }[name]
              }
              name={name}
              errors={errors}
              required={name !== 'postalCode'}
            >
              <Input id={name} required={name !== 'postalCode'} {...register(name)} />
            </Field>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <Alert title="Why these documents are required" icon={<FileLock2 aria-hidden="true" />}>
            WarrantyPass reviewers use private business documents to confirm that verified
            warranties come from legitimate organizations. Documents are never public.
          </Alert>
          <FormField
            label="Select verification documents"
            htmlFor="verification-documents"
            hint="PDF, JPEG, PNG, or WebP. Each file may be up to 10 MB."
          >
            <Input
              id="verification-documents"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(event) => setDocuments(Array.from(event.target.files ?? []))}
            />
          </FormField>
          <p className="text-sm text-[var(--text-muted)]">
            {documents.length
              ? `${documents.length} document${documents.length === 1 ? '' : 's'} selected. Upload starts after the owner email is verified.`
              : 'You may continue now and upload documents securely from the saved draft.'}
          </p>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-3 pt-6 text-sm">
              {[
                ['Owner', values.ownerFullName],
                ['Business', values.legalName],
                ['Display name', values.displayName],
                ['Trade Licence', values.tradeLicenseNumber],
                ['Contact', `${values.phone} · ${values.businessEmail}`],
                ['Location', `${values.area}, ${values.district}, ${values.division}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-5 border-b pb-3 last:border-0">
                  <span className="text-[var(--text-subtle)]">{label}</span>
                  <span className="text-right font-semibold">{value || 'Not provided'}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          {(
            [
              ['acceptedTerms', 'I accept the WarrantyPass Terms of Service.'],
              [
                'acceptedPrivacy',
                'I accept the Privacy Policy and private-document handling terms.',
              ],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-start gap-3 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--primary)]"
                {...register(name)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={step === 0 || isSubmitting}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          <ChevronLeft aria-hidden="true" size={18} /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" onClick={() => void next()}>
            Next <ChevronRight aria-hidden="true" size={18} />
          </Button>
        ) : (
          <Button type="submit" disabled={isSubmitting}>
            <Check aria-hidden="true" size={18} />
            {isSubmitting ? 'Creating secure draft…' : 'Create application draft'}
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  errors,
  required = true,
  hint,
  children,
}: {
  label: string;
  name: keyof BusinessRegistrationInput;
  errors: FieldErrors<BusinessRegistrationInput>;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <FormField
      label={label}
      htmlFor={name}
      required={required}
      hint={hint}
      error={typeof errors[name]?.message === 'string' ? errors[name]?.message : undefined}
    >
      {children}
    </FormField>
  );
}
