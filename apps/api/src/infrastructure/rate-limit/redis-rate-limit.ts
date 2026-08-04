import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

import type { AppConfig } from '../../config/env.js';
import type { RateLimitStoreFactory } from '../../common/security/rate-limit.js';

export class RedisRateLimitInfrastructure {
  private readonly client;

  public constructor(config: AppConfig) {
    if (!config.REDIS_URL) throw new Error('REDIS_URL is required for the Redis rate-limit store.');
    this.client = createClient({ url: config.REDIS_URL });
  }

  public async connect(): Promise<void> {
    await this.client.connect();
  }

  public async disconnect(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }

  public readonly storeFactory: RateLimitStoreFactory = (namespace) =>
    new RedisStore({
      prefix: `warrantypass:rate-limit:${namespace}:`,
      sendCommand: (...args: string[]) => this.client.sendCommand(args),
    });
}
