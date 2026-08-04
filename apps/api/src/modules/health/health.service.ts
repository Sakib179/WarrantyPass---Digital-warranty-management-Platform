import type { DatabaseHealthDto, HealthDto, VersionDto } from '@warrantypass/shared';

import type { AppConfig } from '../../config/env.js';
import { ServiceUnavailableError } from '../../common/errors/app-error.js';
import type { DatabaseHealthPort } from '../../infrastructure/database/database-health.port.js';

export class HealthService {
  public constructor(
    private readonly config: AppConfig,
    private readonly database: DatabaseHealthPort,
  ) {}

  public getServiceHealth(): HealthDto {
    return {
      service: 'WarrantyPass API',
      status: 'healthy',
      version: this.config.APP_VERSION,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime() * 100) / 100,
    };
  }

  public async getDatabaseHealth(): Promise<DatabaseHealthDto> {
    try {
      const latencyMs = await this.database.checkHealth();
      return {
        service: 'database',
        status: 'healthy',
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableError('The database health check failed.', error);
    }
  }

  public getVersion(): VersionDto {
    return {
      service: 'WarrantyPass API',
      version: this.config.APP_VERSION,
      apiVersion: 'v1',
    };
  }
}
