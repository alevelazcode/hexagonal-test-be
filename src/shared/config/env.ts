import { z } from 'zod';

const ENV = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

const nodeEnvSchema = z.enum([ENV.DEVELOPMENT, ENV.TEST, ENV.PRODUCTION]).default(ENV.DEVELOPMENT);

const appPortSchema = z.coerce.number().int().positive().default(3000);

const logLevelSchema = z.enum(['fatal', 'error', 'warn', 'log', 'debug', 'verbose']).default('log');

const corsOriginsSchema = z.string().default('*');

const rateLimitTtlMsSchema = z.coerce.number().int().positive().default(60_000);

const rateLimitLimitSchema = z.coerce.number().int().positive().default(100);

const jwtAccessSecretSchema = z.string().min(32);
const jwtRefreshSecretSchema = z.string().min(32);

const accessTokenTtlMsSchema = z.coerce
  .number()
  .int()
  .positive()
  .default(10 * 60_000);
const refreshTokenTtlMsSchema = z.coerce
  .number()
  .int()
  .positive()
  .default(30 * 24 * 60 * 60_000);

const telegramPollIntervalMsSchema = z.coerce.number().int().positive().default(5_000);
const telegramPollLimitSchema = z.coerce.number().int().min(1).max(100).default(25);
const telegramPollTimeoutSecondsSchema = z.coerce.number().int().min(0).max(60).default(0);

const geminiApiKeySchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length > 0);

export const envSchema = (nodeEnv: z.infer<typeof nodeEnvSchema>) =>
  z.object({
    NODE_ENV: nodeEnvSchema,
    PORT: appPortSchema,
    SQLITE_DB_PATH:
      nodeEnv === ENV.PRODUCTION
        ? z.string().min(1).optional()
        : z.string().min(1).default('./data/app.db').optional(),
    DATABASE_URL: z.string().min(1).optional(),
    LOG_LEVEL: logLevelSchema,
    CORS_ORIGINS: corsOriginsSchema,
    RATE_LIMIT_TTL_MS: rateLimitTtlMsSchema,
    RATE_LIMIT_LIMIT: rateLimitLimitSchema,
    JWT_ACCESS_SECRET: jwtAccessSecretSchema,
    JWT_REFRESH_SECRET: jwtRefreshSecretSchema,
    ACCESS_TOKEN_TTL: accessTokenTtlMsSchema,
    REFRESH_TOKEN_TTL: refreshTokenTtlMsSchema,
    COOKIE_DOMAIN: z.string().min(1).optional(),
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
    TELEGRAM_POLL_INTERVAL_MS: telegramPollIntervalMsSchema,
    TELEGRAM_POLL_LIMIT: telegramPollLimitSchema,
    TELEGRAM_POLL_TIMEOUT_SECONDS: telegramPollTimeoutSecondsSchema,
    GEMINI_API_KEY: geminiApiKeySchema,
  });

export type Env = z.infer<ReturnType<typeof envSchema>>;

export function validateEnv(config: Record<string, unknown>): Env {
  const configWithAliases: Record<string, unknown> = {
    ...config,
    CORS_ORIGINS: config.CORS_ORIGINS ?? config.CORS_ORIGIN,
  };

  const nodeEnv = nodeEnvSchema.parse(configWithAliases.NODE_ENV);
  const parsed = envSchema(nodeEnv).safeParse(configWithAliases);

  if (!parsed.success) {
    const grouped: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.length ? issue.path.join('.') : '_root';
      grouped[key] ??= [];
      grouped[key].push(issue.message);
    }

    const message = Object.entries(grouped)
      .map(([key, errors]) => `- ${key}: ${errors.join(', ')}`)
      .join('\n');

    throw new Error(`Invalid environment variables:\n${message}`);
  }

  const databaseUrlInput = parsed.data.DATABASE_URL;
  const sqliteDbPathInput = parsed.data.SQLITE_DB_PATH;

  if (sqliteDbPathInput && databaseUrlInput) {
    const urlPath = databaseUrlInput.startsWith('file:') ? databaseUrlInput.slice('file:'.length) : null;

    if (urlPath !== sqliteDbPathInput) {
      throw new Error(
        'Invalid environment variables:\n- SQLITE_DB_PATH and DATABASE_URL are both set but do not match. Prefer setting only SQLITE_DB_PATH.',
      );
    }
  }

  const sqliteDbPath =
    sqliteDbPathInput ??
    (databaseUrlInput?.startsWith('file:') ? databaseUrlInput.slice('file:'.length) : undefined) ??
    (nodeEnv === ENV.PRODUCTION ? undefined : './data/app.db');
  const databaseUrl = databaseUrlInput ?? (sqliteDbPath ? `file:${sqliteDbPath}` : undefined);

  if (!databaseUrl) {
    throw new Error(
      'Invalid environment variables:\n- SQLITE_DB_PATH: required when DATABASE_URL is not provided',
    );
  }

  const corsOrigins = parsed.data.CORS_ORIGINS;

  const normalized: Env = {
    ...parsed.data,
    SQLITE_DB_PATH: sqliteDbPath,
    DATABASE_URL: databaseUrl,
  };

  process.env.NODE_ENV = normalized.NODE_ENV;
  process.env.PORT = String(normalized.PORT);

  if (sqliteDbPath) {
    process.env.SQLITE_DB_PATH = sqliteDbPath;
  } else {
    delete process.env.SQLITE_DB_PATH;
  }

  process.env.DATABASE_URL = databaseUrl;
  process.env.LOG_LEVEL = normalized.LOG_LEVEL;
  process.env.CORS_ORIGINS = corsOrigins;
  process.env.CORS_ORIGIN = corsOrigins;
  process.env.RATE_LIMIT_TTL_MS = String(normalized.RATE_LIMIT_TTL_MS);
  process.env.RATE_LIMIT_LIMIT = String(normalized.RATE_LIMIT_LIMIT);
  process.env.JWT_ACCESS_SECRET = normalized.JWT_ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = normalized.JWT_REFRESH_SECRET;
  process.env.ACCESS_TOKEN_TTL = String(normalized.ACCESS_TOKEN_TTL);
  process.env.REFRESH_TOKEN_TTL = String(normalized.REFRESH_TOKEN_TTL);

  process.env.TELEGRAM_POLL_INTERVAL_MS = String(normalized.TELEGRAM_POLL_INTERVAL_MS);
  process.env.TELEGRAM_POLL_LIMIT = String(normalized.TELEGRAM_POLL_LIMIT);
  process.env.TELEGRAM_POLL_TIMEOUT_SECONDS = String(normalized.TELEGRAM_POLL_TIMEOUT_SECONDS);

  process.env.GEMINI_API_KEY = normalized.GEMINI_API_KEY;

  if (normalized.COOKIE_DOMAIN) {
    process.env.COOKIE_DOMAIN = normalized.COOKIE_DOMAIN;
  } else {
    delete process.env.COOKIE_DOMAIN;
  }

  return normalized;
}
