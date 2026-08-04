import { describe, expect, it } from 'vitest';

import {
  businessRegistrationSchema,
  customerRegistrationSchema,
  loginSchema,
  passwordSchema,
} from './index.js';

describe('authentication contracts', () => {
  it('normalizes valid login emails', () => {
    const parsed = loginSchema.parse({
      email: ' Customer@Example.COM ',
      password: 'not-validated-at-login',
    });
    expect(parsed.email).toBe('customer@example.com');
  });

  it('rejects weak customer passwords', () => {
    const parsed = customerRegistrationSchema.safeParse({
      email: 'customer@example.com',
      password: 'weak',
      confirmPassword: 'weak',
      acceptedTerms: true,
    });
    expect(parsed.success).toBe(false);
  });

  it('requires business verification identifiers', () => {
    const parsed = businessRegistrationSchema.safeParse({
      businessName: 'Dhaka Devices',
      businessEmail: 'ops@example.com',
      registrationType: 'TRADE_LICENSE',
      registrationNumber: '',
      password: 'LongSecurePassword123',
      confirmPassword: 'LongSecurePassword123',
      acceptedTerms: true,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts strong passphrases without arbitrary composition rules', () => {
    expect(passwordSchema.safeParse('a memorable warranty vault phrase').success).toBe(true);
  });

  it('rejects compromised and repetitive passwords', () => {
    expect(passwordSchema.safeParse('password1234').success).toBe(false);
    expect(passwordSchema.safeParse('aaaaaaaaaaaa').success).toBe(false);
  });
});
