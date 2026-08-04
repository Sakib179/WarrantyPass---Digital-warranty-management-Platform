import type { ApiErrorDetail } from '@warrantypass/shared';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: ApiErrorDetail[];
  public readonly isOperational: boolean;

  public constructor(options: {
    code: string;
    message: string;
    statusCode: number;
    details?: ApiErrorDetail[];
    cause?: unknown;
    isOperational?: boolean;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details ?? [];
    this.isOperational = options.isOperational ?? true;
  }
}

export class NotFoundError extends AppError {
  public constructor(message = 'The requested resource was not found.') {
    super({
      code: 'NOT_FOUND',
      message,
      statusCode: 404,
    });
  }
}

export class ServiceUnavailableError extends AppError {
  public constructor(message = 'A required service is temporarily unavailable.', cause?: unknown) {
    super({
      code: 'SERVICE_UNAVAILABLE',
      message,
      statusCode: 503,
      cause,
    });
  }
}
