import { z } from 'zod';

const compromisedPasswords = new Set([
  '123456789012',
  'password1234',
  'qwertyuiop12',
  'letmein123456',
  'warrantypass',
]);

export const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(254, 'Email address is too long'));

export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine((password) => !compromisedPasswords.has(password.toLowerCase()), {
    message: 'Choose a less commonly used password',
  })
  .refine((password) => new Set(password.toLowerCase()).size >= 6, {
    message: 'Use a less repetitive password or passphrase',
  });

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong';
} {
  let points = 0;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;
  if (/[a-z]/i.test(password) && /\d/.test(password)) points += 1;
  if (/[^a-z0-9]/i.test(password) || password.includes(' ')) points += 1;
  const score = Math.min(4, points) as 0 | 1 | 2 | 3 | 4;
  return {
    score,
    label: ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][score] as
      'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong',
  };
}

export const loginSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1, 'Password is required').max(128),
  rememberMe: z.boolean().default(false),
});

export const customerRegistrationSchema = z
  .object({
    email: normalizedEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().trim().min(2).max(120).optional().or(z.literal('')),
    mobileNumber: z.string().trim().min(7).max(32).optional().or(z.literal('')),
    preferredLanguage: z.enum(['en-BD', 'bn-BD']).default('en-BD'),
    acceptedTerms: z.boolean().refine(Boolean, 'You must accept the Terms of Service'),
    acceptedPrivacy: z.boolean().refine(Boolean, 'You must accept the Privacy Policy'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const emailTokenSchema = z.object({
  token: z.string().trim().min(32).max(512),
});

export const emailResendSchema = z.object({
  email: normalizedEmailSchema,
});

export const forgotPasswordSchema = z.object({
  email: normalizedEmailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(32).max(512),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).nullable().optional(),
  mobileNumber: z.string().trim().min(7).max(32).nullable().optional(),
  preferredLanguage: z.enum(['en-BD', 'bn-BD']).optional(),
});

export const requestEmailChangeSchema = z.object({
  newEmail: normalizedEmailSchema,
  password: z.string().min(1).max(128),
});

export const deactivateAccountSchema = z.object({
  password: z.string().min(1).max(128),
});

export type LoginInput = z.input<typeof loginSchema>;
export type CustomerRegistrationInput = z.input<typeof customerRegistrationSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type RequestEmailChangeInput = z.input<typeof requestEmailChangeSchema>;
