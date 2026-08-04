import { Router } from 'express';

import { asyncHandler } from '../../common/middleware/async-handler.js';
import type { HealthController } from './health.controller.js';

export function createHealthRouter(controller: HealthController): Router {
  const router = Router();

  router.get('/health', controller.health);
  router.get('/health/database', asyncHandler(controller.database));
  router.get('/version', controller.version);

  return router;
}
