import { describe, expect, it } from 'vitest';

import { parseEnvironment } from '../../config/env.js';
import { Argon2PasswordHasher } from './password.js';

const config = parseEnvironment({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  AUTH_ACCESS_TOKEN_SECRET: 'password-test-access-secret-at-least-32-characters',
  AUTH_REFRESH_TOKEN_SECRET: 'password-test-refresh-secret-at-least-32-characters',
  PASSWORD_HASH_MEMORY_COST: '19456',
  PASSWORD_HASH_TIME_COST: '2',
});

describe('Argon2PasswordHasher', () => {
  it('hashes with Argon2id and verifies without exposing the passphrase', async () => {
    const hasher = new Argon2PasswordHasher(config);
    const passphrase = 'correct horse battery staple';
    const hash = await hasher.hash(passphrase);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(passphrase);
    await expect(hasher.verify(passphrase, hash)).resolves.toBe(true);
    await expect(hasher.verify('wrong passphrase', hash)).resolves.toBe(false);
  });
});
