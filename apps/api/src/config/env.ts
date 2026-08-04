import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

function durationToSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const amount = Number(match[1]);
  const multipliers = { s: 1, m: 60, h: 3_600, d: 86_400 } as const;
  return amount * multipliers[match[2] as keyof typeof multipliers];
}

const durationSchema = z
  .string()
  .regex(/^\d+(s|m|h|d)$/, 'Use a duration such as 15m, 24h, or 30d')
  .transform(durationToSeconds);

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  WEB_URL: z.url().default('http://localhost:3000'),
  API_URL: z.url().default('http://localhost:4000'),
  APP_VERSION: z.string().trim().min(1).default('0.2.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: booleanString.default(false),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_STORE: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().url().optional(),
  JSON_BODY_LIMIT: z
    .string()
    .regex(/^\d+(kb|mb)$/i)
    .default('1mb'),

  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32),
  AUTH_REFRESH_TOKEN_SECRET: z.string().min(32),
  AUTH_ACCESS_TOKEN_EXPIRES_IN: durationSchema.default(15 * 60),
  AUTH_REFRESH_TOKEN_EXPIRES_IN: durationSchema.default(7 * 86_400),
  AUTH_REMEMBER_ME_EXPIRES_IN: durationSchema.default(30 * 86_400),
  AUTH_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default('wp_refresh'),
  AUTH_CSRF_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default('wp_csrf'),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SECURE: booleanString.default(false),
  AUTH_COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  AUTH_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  AUTH_LOCKOUT_DURATION: durationSchema.default(15 * 60),

  PASSWORD_HASH_MEMORY_COST: z.coerce.number().int().min(19_456).default(65_536),
  PASSWORD_HASH_TIME_COST: z.coerce.number().int().min(2).max(10).default(3),
  PASSWORD_HASH_PARALLELISM: z.coerce.number().int().min(1).max(8).default(1),
  EMAIL_VERIFICATION_EXPIRES_IN: durationSchema.default(24 * 3_600),
  PASSWORD_RESET_EXPIRES_IN: durationSchema.default(3_600),
  INVITATION_EXPIRES_IN: durationSchema.default(7 * 86_400),
  TERMS_VERSION: z.string().trim().min(1).default('2026-08-01'),
  PRIVACY_VERSION: z.string().trim().min(1).default('2026-08-01'),

  EMAIL_PROVIDER: z.enum(['smtp', 'memory']).default('smtp'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(1025),
  SMTP_SECURE: booleanString.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.email().default('no-reply@warrantypass.local'),
  SMTP_FROM_NAME: z.string().trim().min(1).default('WarrantyPass'),
  MAILPIT_WEB_URL: z.url().default('http://localhost:8025'),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().default('./uploads'),
  VERIFICATION_DOCUMENT_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1_024)
    .max(25 * 1_024 * 1_024)
    .default(10 * 1_024 * 1_024),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('ap-southeast-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: booleanString.default(false),

  PLATFORM_ADMIN_EMAIL: z.email().optional(),
  PLATFORM_ADMIN_PASSWORD: z.string().min(12).max(128).optional(),
  PLATFORM_REVIEWER_EMAIL: z.email().optional(),
  PLATFORM_REVIEWER_PASSWORD: z.string().min(12).max(128).optional(),
});

export type AppConfig = z.output<typeof environmentSchema>;

const productionRequiredVariables = [
  'AUTH_ACCESS_TOKEN_EXPIRES_IN',
  'AUTH_REFRESH_TOKEN_EXPIRES_IN',
  'AUTH_REMEMBER_ME_EXPIRES_IN',
  'AUTH_COOKIE_NAME',
  'AUTH_COOKIE_SECURE',
  'AUTH_COOKIE_SAME_SITE',
  'PASSWORD_HASH_MEMORY_COST',
  'PASSWORD_HASH_TIME_COST',
  'PASSWORD_HASH_PARALLELISM',
  'EMAIL_VERIFICATION_EXPIRES_IN',
  'PASSWORD_RESET_EXPIRES_IN',
  'INVITATION_EXPIRES_IN',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
  'RATE_LIMIT_STORE',
] as const;

export function parseEnvironment(input: NodeJS.ProcessEnv): AppConfig {
  const parsed = environmentSchema.safeParse(input);

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  const config = parsed.data;
  const origins = config.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.some((origin) => origin === '*')) {
    throw new Error('Invalid environment configuration: CORS_ORIGINS cannot contain wildcards');
  }

  if (config.NODE_ENV === 'production') {
    const missing = productionRequiredVariables.filter((name) => input[name] === undefined);
    if (missing.length > 0) {
      throw new Error(
        `Invalid environment configuration: production values are required for ${missing.join(', ')}`,
      );
    }
    if (!config.AUTH_COOKIE_SECURE) {
      throw new Error(
        'Invalid environment configuration: AUTH_COOKIE_SECURE must be true in production',
      );
    }
    if (config.EMAIL_PROVIDER !== 'smtp') {
      throw new Error(
        'Invalid environment configuration: EMAIL_PROVIDER must be smtp in production',
      );
    }
    if (config.RATE_LIMIT_STORE !== 'redis' || !config.REDIS_URL) {
      throw new Error(
        'Invalid environment configuration: production requires RATE_LIMIT_STORE=redis and REDIS_URL',
      );
    }
  }

  if (
    config.STORAGE_PROVIDER === 's3' &&
    (!config.S3_BUCKET || !config.S3_ACCESS_KEY_ID || !config.S3_SECRET_ACCESS_KEY)
  ) {
    throw new Error('Invalid environment configuration: S3 credentials and bucket are required');
  }

  return config;
}
