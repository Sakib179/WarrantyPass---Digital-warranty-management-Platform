import type { ApiErrorBody, ApiSuccess, AuthenticationDto } from '@warrantypass/shared';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const csrfCookieName = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? 'wp_csrf';

let accessToken: string | null = null;
let activeBusinessId: string | null = null;
let refreshPromise: Promise<AuthenticationDto | null> | null = null;

export class ApiClientError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details: ApiErrorBody['error']['details'] = [],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function setAuthenticationToken(token: string | null): void {
  accessToken = token;
}

export function setActiveBusinessId(businessId: string | null): void {
  activeBusinessId = businessId;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { retryAuthentication?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  if (activeBusinessId) headers.set('x-business-id', activeBusinessId);
  if (isStateChanging(options.method)) {
    const csrf = readCookie(csrfCookieName);
    if (csrf) headers.set('x-csrf-token', csrf);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (
    response.status === 401 &&
    options.retryAuthentication !== false &&
    path !== '/auth/login' &&
    path !== '/auth/refresh'
  ) {
    const refreshed = await refreshAuthentication();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryAuthentication: false });
    }
  }
  return parseResponse<T>(response);
}

export async function refreshAuthentication(): Promise<AuthenticationDto | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const csrf = readCookie(csrfCookieName);
      if (!csrf) return null;
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrf },
      });
      const authentication = await parseResponse<AuthenticationDto>(response);
      accessToken = authentication.accessToken;
      activeBusinessId =
        authentication.user.businesses.find((business) => business.isCurrent)?.id ??
        authentication.user.businesses[0]?.id ??
        null;
      return authentication;
    } catch {
      accessToken = null;
      activeBusinessId = null;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function downloadPrivateFile(
  path: string,
  fileName: string,
  retryAuthentication = true,
): Promise<void> {
  const headers = new Headers();
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);
  if (activeBusinessId) headers.set('x-business-id', activeBusinessId);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && retryAuthentication && (await refreshAuthentication())) {
    return downloadPrivateFile(path, fileName, false);
  }
  if (!response.ok) {
    await parseResponse(response);
    return;
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function clearApiAuthentication(): void {
  accessToken = null;
  activeBusinessId = null;
  refreshPromise = null;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiSuccess<T> | ApiErrorBody;
  if (!response.ok || !body.success) {
    const error = body.success
      ? { code: 'HTTP_ERROR', message: 'The request failed.', details: [] }
      : body.error;
    throw new ApiClientError(error.code, error.message, response.status, error.details);
  }
  return body.data;
}

function isStateChanging(method: string | undefined): boolean {
  return method !== undefined && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
  return value ? decodeURIComponent(value) : null;
}
