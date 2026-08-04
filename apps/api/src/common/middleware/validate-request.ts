import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../errors/app-error.js';

type RequestSource = 'body' | 'params' | 'query';

export function validateRequest(source: RequestSource, schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[source]);

    if (!parsed.success) {
      next(
        new AppError({
          code: 'VALIDATION_ERROR',
          message: 'The request contains invalid data.',
          statusCode: 400,
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        }),
      );
      return;
    }

    if (source === 'body') {
      req.body = parsed.data;
    } else if (source === 'params') {
      req.params = parsed.data as Request['params'];
    } else {
      Object.assign(req.query, parsed.data);
    }

    next();
  };
}
