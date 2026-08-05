import type {
  WarrantyOperationalStatusDto,
  WarrantyVerificationStatusDto,
} from '@warrantypass/shared';

const DAY_MS = 86_400_000;

export function parseDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) throw new RangeError('Invalid date-only value');
  return date;
}

export function formatDateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function addWarrantyDuration(
  startDate: string,
  value: number,
  unit: 'DAYS' | 'MONTHS' | 'YEARS',
): string {
  const result = parseDateOnly(startDate);
  if (unit === 'DAYS') result.setUTCDate(result.getUTCDate() + value);
  if (unit === 'MONTHS' || unit === 'YEARS') {
    const day = result.getUTCDate();
    const targetMonth = result.getUTCMonth() + (unit === 'MONTHS' ? value : value * 12);
    const targetYear = result.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    result.setUTCFullYear(targetYear, normalizedMonth, Math.min(day, lastDay));
  }
  return result.toISOString().slice(0, 10);
}

export function calculateWarrantyStatus(input: {
  storedStatus: string;
  verificationStatus: WarrantyVerificationStatusDto;
  startDate: Date | null;
  endDate: Date | null;
  now?: Date;
  expiringSoonDays?: number;
}): WarrantyOperationalStatusDto {
  if (input.verificationStatus === 'REVOKED' || input.storedStatus === 'REVOKED') return 'REVOKED';
  if (input.storedStatus === 'INVALID' || input.verificationStatus === 'REJECTED') return 'INVALID';
  if (input.storedStatus === 'VOIDED') return 'VOIDED';

  const today = Date.UTC(
    (input.now ?? new Date()).getUTCFullYear(),
    (input.now ?? new Date()).getUTCMonth(),
    (input.now ?? new Date()).getUTCDate(),
  );
  if (input.startDate && input.startDate.valueOf() > today) return 'NOT_STARTED';
  if (input.endDate && input.endDate.valueOf() < today) return 'EXPIRED';
  if (
    input.endDate &&
    Math.ceil((input.endDate.valueOf() - today) / DAY_MS) <= (input.expiringSoonDays ?? 30)
  ) {
    return 'EXPIRING_SOON';
  }
  return 'ACTIVE';
}

export function remainingDays(endDate: Date | null, now = new Date()): number | null {
  if (!endDate) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.ceil((endDate.valueOf() - today) / DAY_MS));
}

export function maskSerialNumber(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}
