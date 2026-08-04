import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type Router } from 'express';
import rateLimit, { type Store } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import type { AppConfig } from './config/env.js';
import { createErrorHandler } from './common/middleware/error-handler.js';
import { notFoundMiddleware } from './common/middleware/not-found.js';
import { requestIdMiddleware } from './common/middleware/request-id.js';
import type { AppLogger } from './common/logging/logger.js';
import { createCorsOptions } from './common/security/cors.js';
import { createOpenApiDocument } from './docs/openapi.js';
import type { DatabaseHealthPort } from './infrastructure/database/database-health.port.js';
import { HealthController } from './modules/health/health.controller.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { HealthService } from './modules/health/health.service.js';

export interface AppDependencies {
  config: AppConfig;
  database: DatabaseHealthPort;
  logger: AppLogger;
  featureRouter?: Router;
  globalRateLimitStore?: Store;
}

export function createApp({
  config,
  database,
  logger,
  featureRouter,
  globalRateLimitStore,
}: AppDependencies): Express {
  const app = express();
  const openApiDocument = createOpenApiDocument(config);

  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY ? 1 : false);

  app.use(requestIdMiddleware);
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => String(res.getHeader('x-request-id')),
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers.x-csrf-token',
        'res.headers["set-cookie"]',
      ],
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(cors(createCorsOptions(config)));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: config.JSON_BODY_LIMIT, strict: true }));
  app.use(express.urlencoded({ extended: false, limit: config.JSON_BODY_LIMIT }));

  if (config.NODE_ENV !== 'test') {
    app.use(
      '/api',
      rateLimit({
        windowMs: config.RATE_LIMIT_WINDOW_MS,
        limit: config.RATE_LIMIT_MAX,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        ...(globalRateLimitStore ? { store: globalRateLimitStore } : {}),
        handler: (_req, res) => {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please wait before trying again.',
              details: [],
            },
          });
        },
      }),
    );
  }

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        service: 'WarrantyPass API',
        documentation: '/api/docs',
        health: '/api/v1/health',
      },
      meta: {},
    });
  });

  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiDocument);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'WarrantyPass API Documentation',
    }),
  );

  const healthService = new HealthService(config, database);
  const healthController = new HealthController(healthService);
  app.use('/api/v1', createHealthRouter(healthController));
  if (featureRouter) app.use('/api/v1', featureRouter);

  app.use(notFoundMiddleware);
  app.use(createErrorHandler(config, logger));

  return app;
}
