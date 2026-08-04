import { createHash } from 'node:crypto';

import type { Request } from 'express';
import { UAParser } from 'ua-parser-js';

export interface RequestMetadata {
  requestId: string;
  ipAddress?: string;
  ipHint?: string;
  userAgent?: string;
  deviceName: string;
  browser: string | null;
  operatingSystem: string | null;
}

export function requestMetadata(req: Request): RequestMetadata {
  const userAgent = req.get('user-agent')?.slice(0, 500);
  const parsed = UAParser(userAgent ?? '');
  const browser = parsed.browser.name ?? null;
  const operatingSystem = parsed.os.name ?? null;
  const deviceName = [browser, operatingSystem].filter(Boolean).join(' on ') || 'Unknown device';
  const ipAddress = normalizeIp(req.ip);

  return {
    requestId: String(req.res?.locals.requestId ?? 'unknown'),
    ...(ipAddress ? { ipAddress, ipHint: privacyIpHint(ipAddress) } : {}),
    ...(userAgent ? { userAgent } : {}),
    deviceName,
    browser,
    operatingSystem,
  };
}

function normalizeIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function privacyIpHint(ip: string): string {
  const digest = createHash('sha256').update(ip).digest('hex').slice(0, 8);
  if (ip.includes(':')) return `IPv6 •••• (${digest})`;
  const segments = ip.split('.');
  return segments.length === 4 ? `${segments[0]}.${segments[1]}.x.x` : `Network ${digest}`;
}
