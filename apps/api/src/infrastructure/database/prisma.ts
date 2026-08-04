import { PrismaPg } from '@prisma/adapter-pg';

import type { AppConfig } from '../../config/env.js';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { DatabaseHealthPort } from './database-health.port.js';

export class PrismaDatabase implements DatabaseHealthPort {
  public readonly client: PrismaClient;

  public constructor(config: AppConfig) {
    const adapter = new PrismaPg({
      connectionString: config.DATABASE_URL,
    });
    this.client = new PrismaClient({ adapter });
  }

  public async connect(): Promise<void> {
    await this.client.$connect();
  }

  public async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  public async checkHealth(): Promise<number> {
    const startedAt = performance.now();
    await this.client.$queryRaw`SELECT 1`;
    return Math.round((performance.now() - startedAt) * 100) / 100;
  }
}
