import type { ApiSuccess, DatabaseHealthDto, HealthDto, VersionDto } from '@warrantypass/shared';
import type { Request, Response } from 'express';

import type { HealthService } from './health.service.js';

export class HealthController {
  public constructor(private readonly service: HealthService) {}

  public health = (_req: Request, res: Response<ApiSuccess<HealthDto>>): void => {
    res.json({
      success: true,
      data: this.service.getServiceHealth(),
      meta: {},
    });
  };

  public database = async (
    _req: Request,
    res: Response<ApiSuccess<DatabaseHealthDto>>,
  ): Promise<void> => {
    res.json({
      success: true,
      data: await this.service.getDatabaseHealth(),
      meta: {},
    });
  };

  public version = (_req: Request, res: Response<ApiSuccess<VersionDto>>): void => {
    res.json({
      success: true,
      data: this.service.getVersion(),
      meta: {},
    });
  };
}
