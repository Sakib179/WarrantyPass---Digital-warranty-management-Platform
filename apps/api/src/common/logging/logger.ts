import pino, { type Logger } from 'pino';

import type { AppConfig } from '../../config/env.js';

export type AppLogger = Logger;

export function createLogger(config: AppConfig): AppLogger {
  return pino({
    level: config.LOG_LEVEL,
    base: {
      service: 'warrantypass-api',
      version: config.APP_VERSION,
      environment: config.NODE_ENV,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.refreshToken',
      ],
      censor: '[REDACTED]',
    },
  });
}
