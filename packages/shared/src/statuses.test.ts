import { describe, expect, it } from 'vitest';

import { formatBdt, formatDhakaDate, isDisplayStatus, statusLabels } from './index.js';

describe('shared status and locale utilities', () => {
  it('recognizes only supported presentation statuses', () => {
    expect(isDisplayStatus('VERIFIED')).toBe(true);
    expect(isDisplayStatus('VERIFIED_BY_A_RANDOM_USER')).toBe(false);
    expect(statusLabels.USER_UPLOADED).toBe('User Uploaded');
  });

  it('formats values for Bangladesh', () => {
    expect(formatBdt(1200)).toContain('1,200');
    expect(formatDhakaDate('2026-01-15T18:30:00.000Z')).toContain('16');
  });
});
