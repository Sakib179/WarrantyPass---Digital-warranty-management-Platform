import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

const safeRequestId = /^[a-zA-Z0-9._-]{8,80}$/;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const received = req.header('x-request-id');
  const requestId = received && safeRequestId.test(received) ? received : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
