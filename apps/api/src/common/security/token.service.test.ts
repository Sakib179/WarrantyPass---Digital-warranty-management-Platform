import { describe, expect, it } from 'vitest';

import { parseEnvironment } from '../../config/env.js';
import { TokenService } from './token.service.js';

const config = parseEnvironment({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  AUTH_ACCESS_TOKEN_SECRET: 'token-test-access-secret-at-least-32-characters',
  AUTH_REFRESH_TOKEN_SECRET: 'token-test-refresh-secret-at-least-32-characters',
});

describe('TokenService', () => {
  it('signs and verifies minimal access claims', async () => {
    const service = new TokenService(config);
    const created = await service.createAccessToken({
      userId: 'user-id',
      sessionId: 'session-id',
      kind: 'CUSTOMER',
    });
    await expect(service.verifyAccessToken(created.token)).resolves.toMatchObject({
      subject: 'user-id',
      sessionId: 'session-id',
      kind: 'CUSTOMER',
    });
    expect(created.token).not.toContain('user-id');
  });

  it('creates opaque refresh credentials and stable non-plaintext hashes', () => {
    const service = new TokenService(config);
    const token = service.createRefreshToken('session-id');
    expect(token.startsWith('session-id.')).toBe(true);
    expect(service.hashToken(token)).toHaveLength(64);
    expect(service.hashToken(token)).not.toContain(token);
    expect(service.safeTokenEquals(token, token)).toBe(true);
  });
});
