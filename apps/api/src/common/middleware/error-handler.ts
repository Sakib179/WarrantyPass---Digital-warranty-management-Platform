import type { ApiErrorBody } from '@warrantypass/shared';
import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

import type { AppConfig } from '../../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { AppLogger } from '../logging/logger.js';

export function createErrorHandler(config: AppConfig, logger: AppLogger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next): void => {
    // Express identifies error middleware by its four-argument signature.
    void _next;
    let normalized: AppError;

    if (error instanceof AppError) {
      normalized = error;
    } else if (error instanceof ZodError) {
      normalized = new AppError({
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid data.',
        statusCode: 400,
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
    } else if (error instanceof MulterError) {
      normalized = new AppError({
        code: error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'VALIDATION_ERROR',
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'The uploaded file exceeds the permitted size.'
            : 'The file upload could not be accepted.',
        statusCode: error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
      });
    } else {
      normalized = new AppError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        statusCode: 500,
        cause: error,
        isOperational: false,
      });
    }

    const requestId = String(res.locals.requestId ?? 'unknown');
    const logPayload = {
      err: error,
      requestId,
      code: normalized.code,
      statusCode: normalized.statusCode,
    };

    if (normalized.statusCode >= 500) {
      logger.error(logPayload, 'Request failed');
    } else {
      logger.warn(logPayload, 'Request rejected');
    }

    const body: ApiErrorBody = {
      success: false,
      error: {
        code: normalized.code,
        message:
          config.NODE_ENV === 'production' && !normalized.isOperational
            ? 'An unexpected error occurred.'
            : normalized.message,
        details: normalized.details,
      },
    };

    res.status(normalized.statusCode).json(body);
  };
}
