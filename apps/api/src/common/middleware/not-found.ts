import type { NextFunction, Request, Response } from 'express';

import { NotFoundError } from '../errors/app-error.js';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.path} was not found.`));
}
