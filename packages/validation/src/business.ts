import { BUSINESS_PERMISSIONS } from '@warrantypass/shared';
import { z } from 'zod';

import { normalizedEmailSchema, passwordSchema } from './auth.js';

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);

const identifierSchema = z
  .string()
  .trim()
  .min(3, 'Enter the registered identifier')
  .max(80)
  .regex(/^[\p{L}\p{N}./ -]+$/u, 'Use letters, numbers, spaces, slashes, dots, or hyphens');

export const businessApplicationFieldsSchema = z.object({
  ownerFullName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().min(2).max(180),
  displayName: z.string().trim().min(2).max(160),
  businessType: z.string().trim().min(2).max(80),
  tradeLicenseNumber: identifierSchema,
  binNumber: identifierSchema.optional().or(z.literal('')),
  yearEstablished: z.coerce.number().int().min(1800).max(2200).optional(),
  phone: z.string().trim().min(7).max(32),
  businessEmail: normalizedEmailSchema,
  website: z.url('Enter a complete website URL').max(300).optional().or(z.literal('')),
  addressLine: z.string().trim().min(3).max(220),
  area: z.string().trim().min(2).max(120),
  district: z.string().trim().min(2).max(80),
  division: z.string().trim().min(2).max(80),
  postalCode: optionalText(20),
});

export const businessRegistrationSchema = businessApplicationFieldsSchema
  .extend({
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptedTerms: z.boolean().refine(Boolean, 'You must accept the Terms of Service'),
    acceptedPrivacy: z.boolean().refine(Boolean, 'You must accept the Privacy Policy'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const businessDraftSchema = businessApplicationFieldsSchema.partial();

export const invitationSchema = z.object({
  email: normalizedEmailSchema,
  roleId: z.uuid(),
  personalMessage: optionalText(500),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const invitationTokenSchema = z.object({
  token: z.string().min(32).max(512),
});

const permissionValues = Object.values(BUSINESS_PERMISSIONS) as [string, ...string[]];

export const roleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: optionalText(300),
  permissions: z.array(z.enum(permissionValues)).min(1).max(permissionValues.length),
});

export const roleAssignmentSchema = z.object({
  roleIds: z.array(z.uuid()).min(1).max(10),
});

export const businessSwitchSchema = z.object({
  businessId: z.uuid(),
});

export type BusinessRegistrationInput = z.input<typeof businessRegistrationSchema>;
