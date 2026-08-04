import { describe, expect, it } from 'vitest';

import { isValidBusinessTransition } from './platform.service.js';

describe('business verification state machine', () => {
  it('allows only explicit verification transitions', () => {
    expect(isValidBusinessTransition('DRAFT', 'PENDING')).toBe(true);
    expect(isValidBusinessTransition('PENDING', 'IN_REVIEW')).toBe(true);
    expect(isValidBusinessTransition('IN_REVIEW', 'VERIFIED')).toBe(true);
    expect(isValidBusinessTransition('VERIFIED', 'SUSPENDED')).toBe(true);
    expect(isValidBusinessTransition('DRAFT', 'VERIFIED')).toBe(false);
    expect(isValidBusinessTransition('REJECTED', 'VERIFIED')).toBe(false);
  });
});
