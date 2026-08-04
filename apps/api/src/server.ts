import { createServer } from 'node:http';
import { resolve } from 'node:path';

import { config as loadEnvironmentFile } from 'dotenv';

import { createApp } from './app.js';
import { parseEnvironment } from './config/env.js';
import { createLogger } from './common/logging/logger.js';
import { AuditService } from './common/security/audit.service.js';
import { PrismaDatabase } from './infrastructure/database/prisma.js';
import { MemoryEmailProvider, type EmailProvider } from './infrastructure/email/email-provider.js';
import { SmtpEmailProvider } from './infrastructure/email/smtp-email-provider.js';
import { RedisRateLimitInfrastructure } from './infrastructure/rate-limit/redis-rate-limit.js';
import { LocalStorageProvider } from './infrastructure/storage/local-storage-provider.js';
import { S3StorageProvider } from './infrastructure/storage/s3-storage-provider.js';
import { createV1FeatureRouter } from './modules/v1-feature-router.js';

loadEnvironmentFile({
  path: resolve(import.meta.dirname, '../../../.env'),
  quiet: true,
});

const config = parseEnvironment(process.env);
const logger = createLogger(config);
const database = new PrismaDatabase(config);
const email: EmailProvider =
  config.EMAIL_PROVIDER === 'memory' ? new MemoryEmailProvider() : new SmtpEmailProvider(config);
const storage = createStorageProvider();
const audit = new AuditService(database.client);
const redisRateLimits =
  config.RATE_LIMIT_STORE === 'redis' ? new RedisRateLimitInfrastructure(config) : undefined;
const featureRouter = createV1FeatureRouter({
  config,
  prisma: database.client,
  email,
  storage,
  audit,
  ...(redisRateLimits ? { rateLimitStoreFactory: redisRateLimits.storeFactory } : {}),
});
const globalRateLimitStore = redisRateLimits?.storeFactory('global');
const app = createApp({
  config,
  database,
  logger,
  featureRouter,
  ...(globalRateLimitStore ? { globalRateLimitStore } : {}),
});
const server = createServer(app);

function createStorageProvider(): LocalStorageProvider | S3StorageProvider {
  if (config.STORAGE_PROVIDER === 'local') {
    return new LocalStorageProvider(config.LOCAL_STORAGE_PATH, config.API_URL);
  }
  if (!config.S3_BUCKET || !config.S3_ACCESS_KEY_ID || !config.S3_SECRET_ACCESS_KEY) {
    throw new Error('Validated S3 storage configuration is incomplete.');
  }
  return new S3StorageProvider({
    ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
    region: config.S3_REGION,
    bucket: config.S3_BUCKET,
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
  });
}

let shuttingDown = false;

function disconnectAfterShutdown(closeError?: Error): void {
  if (closeError) {
    logger.error({ err: closeError }, 'HTTP server failed to close cleanly');
  }

  void Promise.all([database.disconnect(), redisRateLimits?.disconnect()])
    .then(() => {
      logger.info('Infrastructure connections closed');
      process.exitCode = closeError ? 1 : 0;
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, 'Database disconnection failed');
      process.exitCode = 1;
    });
}

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown started');
  if (server.listening) {
    server.close(disconnectAfterShutdown);
  } else {
    disconnectAfterShutdown();
  }

  setTimeout(() => {
    logger.fatal('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  shutdown('SIGTERM');
});

process.on('unhandledRejection', (error) => {
  logger.fatal({ err: error }, 'Unhandled promise rejection');
  shutdown('SIGTERM');
});

function listen(): Promise<void> {
  return new Promise((resolveListen, rejectListen) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      rejectListen(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolveListen();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(config.API_PORT);
  });
}

try {
  await database.connect();
  await redisRateLimits?.connect();
  await listen();
  logger.info(
    {
      port: config.API_PORT,
      docs: `${config.API_URL}/api/docs`,
    },
    'WarrantyPass API started',
  );
} catch (error) {
  logger.fatal({ err: error }, 'API startup failed');
  await Promise.all([
    database.disconnect().catch(() => undefined),
    redisRateLimits?.disconnect().catch(() => undefined),
  ]);
  process.exitCode = 1;
}
