import { describe, expect, it } from 'vitest';

import { parseEnvironment } from './env.js';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  AUTH_ACCESS_TOKEN_SECRET: 'access-secret-with-more-than-thirty-two-characters',
  AUTH_REFRESH_TOKEN_SECRET: 'refresh-secret-with-more-than-thirty-two-characters',
};

describe('environment validation', () => {
  it('applies safe development defaults', () => {
    const config = parseEnvironment(validEnvironment);
    expect(config.API_PORT).toBe(4000);
    expect(config.TRUST_PROXY).toBe(false);
    expect(config.CORS_ORIGINS).toBe('http://localhost:3000');
  });

  it('rejects missing secrets and database configuration', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('rejects wildcard CORS origins', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        CORS_ORIGINS: '*',
      }),
    ).toThrow('cannot contain wildcards');
  });

  it('requires secure cookies in production', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        AUTH_COOKIE_SECURE: 'false',
      }),
    ).toThrow('production values are required');
  });
});
