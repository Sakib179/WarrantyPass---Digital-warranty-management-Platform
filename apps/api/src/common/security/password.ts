import argon2 from 'argon2';

import type { AppConfig } from '../../config/env.js';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export class Argon2PasswordHasher implements PasswordHasher {
  public constructor(private readonly config: AppConfig) {}

  public hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.config.PASSWORD_HASH_MEMORY_COST,
      timeCost: this.config.PASSWORD_HASH_TIME_COST,
      parallelism: this.config.PASSWORD_HASH_PARALLELISM,
    });
  }

  public async verify(password: string, passwordHash: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
