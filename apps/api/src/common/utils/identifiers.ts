export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeBusinessIdentifier(identifier: string): string {
  return identifier
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function slugifyBusinessName(name: string): string {
  const base = name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140);
  return base || 'business';
}
