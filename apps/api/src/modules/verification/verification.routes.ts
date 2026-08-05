import { Router } from 'express';
import type { VerificationController } from './verification.controller.js';

export function createVerificationRouter(input: {
  controller: VerificationController;
}): Router {
  const router = Router();
  const handle = input.controller.handleError;

  // Public unauthenticated route
  router.post(
    '/public/warranty-verification',
    handle(input.controller.verifyWarranty)
  );

  return router;
}
