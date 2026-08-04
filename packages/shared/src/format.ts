const dhakaDateFormatter = new Intl.DateTimeFormat('en-BD', {
  timeZone: 'Asia/Dhaka',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const bdtFormatter = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  maximumFractionDigits: 0,
});

export function formatDhakaDate(value: string | Date): string {
  return dhakaDateFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

export function formatBdt(value: number): string {
  return bdtFormatter.format(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
