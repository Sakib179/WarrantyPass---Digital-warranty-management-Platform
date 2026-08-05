import { describe, expect, it } from 'vitest';

import {
  addWarrantyDuration,
  calculateWarrantyStatus,
  maskSerialNumber,
} from './warranty-status.js';

const now = new Date('2026-08-04T12:00:00.000Z');

describe('warranty date rules', () => {
  it('calculates date-only durations without timezone shifts', () => {
    expect(addWarrantyDuration('2026-01-31', 1, 'MONTHS')).toBe('2026-02-28');
    expect(addWarrantyDuration('2024-02-29', 1, 'YEARS')).toBe('2025-02-28');
  });

  it('uses safety state priority and date-derived statuses', () => {
    expect(
      calculateWarrantyStatus({
        storedStatus: 'ACTIVE',
        verificationStatus: 'REVOKED',
        startDate: null,
        endDate: null,
        now,
      }),
    ).toBe('REVOKED');
    expect(
      calculateWarrantyStatus({
        storedStatus: 'ACTIVE',
        verificationStatus: 'USER_UPLOADED',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-08-20T00:00:00.000Z'),
        now,
      }),
    ).toBe('EXPIRING_SOON');
  });

  it('masks serial numbers in list data', () => {
    expect(maskSerialNumber('SN-123456789')).toBe('••••••••6789');
  });
});
