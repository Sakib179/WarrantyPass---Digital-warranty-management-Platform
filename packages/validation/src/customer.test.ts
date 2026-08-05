import { describe, expect, it } from 'vitest';

import { customerListQuerySchema, manualProductCreateSchema } from './customer.js';

describe('customer wallet contracts', () => {
  it('allowlists sorting and pagination', () => {
    expect(customerListQuerySchema.parse({ sort: 'endingSoon', page: '2' }).page).toBe(2);
    expect(customerListQuerySchema.safeParse({ sort: 'rawSql' }).success).toBe(false);
    expect(customerListQuerySchema.safeParse({ pageSize: 500 }).success).toBe(false);
  });

  it('requires paired warranty duration fields', () => {
    const base = {
      productName: 'Refrigerator',
      categoryId: '20000000-0000-4000-8000-000000000001',
      purchaseDate: '2026-01-01',
      sellerName: 'Dhaka Store',
      warrantyStartDate: '2026-01-01',
    };
    expect(manualProductCreateSchema.safeParse(base).success).toBe(true);
    expect(manualProductCreateSchema.safeParse({ ...base, warrantyDurationValue: 1 }).success).toBe(
      false,
    );
  });
});
