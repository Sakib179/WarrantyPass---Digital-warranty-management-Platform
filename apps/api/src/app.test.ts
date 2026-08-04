import { parseEnvironment } from './config/env.js';
import type { DatabaseHealthPort } from './infrastructure/database/database-health.port.js';
import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

const testConfig = parseEnvironment({
  NODE_ENV: 'test',
  API_PORT: '4000',
  WEB_URL: 'http://localhost:3000',
  API_URL: 'http://localhost:4000',
  APP_VERSION: '0.2.0-test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  CORS_ORIGINS: 'http://localhost:3000',
  LOG_LEVEL: 'silent',
  TRUST_PROXY: 'false',
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX: '120',
  JSON_BODY_LIMIT: '1mb',
  AUTH_ACCESS_TOKEN_SECRET: 'test-access-secret-is-at-least-32-characters',
  AUTH_REFRESH_TOKEN_SECRET: 'test-refresh-secret-is-at-least-32-characters',
  AUTH_COOKIE_SECURE: 'false',
  STORAGE_PROVIDER: 'local',
  LOCAL_STORAGE_PATH: './uploads',
  S3_REGION: 'ap-southeast-1',
  S3_FORCE_PATH_STYLE: 'false',
});

function createDatabase(checkHealth: () => Promise<number>): DatabaseHealthPort {
  return {
    connect: async () => undefined,
    disconnect: async () => undefined,
    checkHealth,
  };
}

const logger = pino({ enabled: false });

describe('WarrantyPass API foundation', () => {
  it('returns structured service health', async () => {
    const response = await request(
      createApp({
        config: testConfig,
        database: createDatabase(async () => 1),
        logger,
      }),
    ).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        service: 'WarrantyPass API',
        status: 'healthy',
        version: '0.2.0-test',
      },
      meta: {},
    });
    expect(response.headers['x-request-id']).toBeTypeOf('string');
  });

  it('checks database health through the injected database port', async () => {
    const response = await request(
      createApp({
        config: testConfig,
        database: createDatabase(async () => 2.5),
        logger,
      }),
    ).get('/api/v1/health/database');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        service: 'database',
        status: 'healthy',
        latencyMs: 2.5,
      },
    });
  });

  it('sanitizes dependency errors into the standard error contract', async () => {
    const response = await request(
      createApp({
        config: testConfig,
        database: createDatabase(async () => {
          throw new Error('database-password-should-never-leak');
        }),
        logger,
      }),
    ).get('/api/v1/health/database');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'The database health check failed.',
        details: [],
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('database-password');
  });

  it('returns a consistent error for unknown API routes', async () => {
    const response = await request(
      createApp({
        config: testConfig,
        database: createDatabase(async () => 1),
        logger,
      }),
    ).get('/api/v1/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/v1/unknown was not found.',
        details: [],
      },
    });
  });
});
