import type { PasswordHasherPort } from '@domain/auth/ports/password-hasher.port';
import type { TelegramClientPort, TelegramUpdate } from '@domain/messaging/ports/telegram-client.port';
import { DATABASE } from '@infrastructure/db/database.constants';
import type { Database } from '@infrastructure/db/database.module';
import { runMigrations } from '@infrastructure/db/migrations';
import { AUTH_PASSWORD_HASHER } from '@interfaces/http/auth/auth.tokens';
import { MESSAGING_TELEGRAM_CLIENT } from '@interfaces/http/messaging/messaging.tokens';
import { CORRELATION_ID_HEADER } from '@interfaces/http/observability/correlation-id';
import { setupHttpApp } from '@interfaces/http/setup-http-app';
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import request, { type Response as SupertestResponse } from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let emailSequence = 0;
function nextTestEmail(): string {
  emailSequence += 1;
  return `auth-e2e-user-${emailSequence}@example.com`;
}

class TestPasswordHasher implements PasswordHasherPort {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hash:${plain}`);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hash:${plain}`);
  }
}

class TestTelegramClient implements TelegramClientPort {
  getUpdates(input?: {
    offset?: number;
    limit?: number;
    timeoutSeconds?: number;
  }): Promise<TelegramUpdate[]> {
    void input;
    return Promise.resolve([]);
  }

  sendMessage(chatId: string, text: string): Promise<{ messageId: number }> {
    void chatId;
    void text;
    return Promise.resolve({ messageId: 1 });
  }
}

function expectProblemDetails(
  res: SupertestResponse,
  expected: {
    status: number;
    title: string;
    errorCode: string;
    instance: string;
    correlationId: string;
    detail?: string;
  },
): void {
  expect(res.headers[CORRELATION_ID_HEADER]).toBe(expected.correlationId);

  expect(res.body).toMatchObject({
    type: 'about:blank',
    title: expected.title,
    status: expected.status,
    instance: expected.instance,
    errorCode: expected.errorCode,
    correlationId: expected.correlationId,
    ...(expected.detail ? { detail: expected.detail } : {}),
  });
}

function extractRefreshCookie(setCookieHeader: string | string[] | undefined): string {
  const cookies = typeof setCookieHeader === 'string' ? [setCookieHeader] : (setCookieHeader ?? []);
  const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
  if (!refreshCookie) {
    throw new Error('Refresh token cookie not set');
  }

  return refreshCookie;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App> | undefined;

  async function registerUser(email: string, password: string): Promise<void> {
    await request(app!.getHttpServer()).post('/api/v1/auth/register').send({ email, password }).expect(201);
  }

  async function loginUser(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshCookie: string;
  }> {
    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const body: unknown = res.body;
    if (
      typeof body !== 'object' ||
      body === null ||
      !('accessToken' in body) ||
      typeof (body as Record<string, unknown>).accessToken !== 'string'
    ) {
      throw new Error('Invalid login response');
    }

    return {
      accessToken: (body as { accessToken: string }).accessToken,
      refreshCookie: extractRefreshCookie(res.headers['set-cookie']),
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_PASSWORD_HASHER)
      .useValue(new TestPasswordHasher())
      .overrideProvider(MESSAGING_TELEGRAM_CLIENT)
      .useValue(new TestTelegramClient())
      .compile();

    app = moduleFixture.createNestApplication();
    setupHttpApp(app);
    await app.init();

    const db = app.get<Database>(DATABASE);
    await runMigrations(db);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns http_bad_request for invalid register dto', async () => {
    const correlationId = 'cid-auth-invalid-register-dto';

    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/register')
      .set(CORRELATION_ID_HEADER, correlationId)
      .send({ email: 'user@example.com', password: 'short' })
      .expect(400);

    expectProblemDetails(res, {
      status: 400,
      title: 'Bad Request',
      errorCode: 'http_bad_request',
      instance: '/api/v1/auth/register',
      correlationId,
      detail: 'Validation failed',
    });

    expect(res.body).toHaveProperty('errors');
  });

  it('returns email_already_exists when registering an existing email', async () => {
    const email = nextTestEmail();
    const password = 'password123';

    await registerUser(email, password);

    const correlationId = 'cid-auth-email-already-exists';

    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/register')
      .set(CORRELATION_ID_HEADER, correlationId)
      .send({ email, password })
      .expect(409);

    expectProblemDetails(res, {
      status: 409,
      title: 'Conflict',
      errorCode: 'email_already_exists',
      instance: '/api/v1/auth/register',
      correlationId,
      detail: 'Email already exists',
    });
  });

  it('returns invalid_credentials when logging in with wrong password', async () => {
    const email = nextTestEmail();
    const password = 'password123';

    await registerUser(email, password);

    const correlationId = 'cid-auth-invalid-credentials';

    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/login')
      .set(CORRELATION_ID_HEADER, correlationId)
      .send({ email, password: 'wrongpass1' })
      .expect(401);

    expectProblemDetails(res, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'invalid_credentials',
      instance: '/api/v1/auth/login',
      correlationId,
      detail: 'Invalid credentials',
    });
  });

  it('returns http_unauthorized when calling /me without access token', async () => {
    const correlationId = 'cid-auth-me-unauthenticated';

    const res = await request(app!.getHttpServer())
      .get('/api/v1/auth/me')
      .set(CORRELATION_ID_HEADER, correlationId)
      .expect(401);

    expectProblemDetails(res, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'http_unauthorized',
      instance: '/api/v1/auth/me',
      correlationId,
      detail: 'Unauthorized',
    });
  });

  it('returns unauthorized when calling /me with an invalid access token', async () => {
    const correlationId = 'cid-auth-me-invalid-token';

    const res = await request(app!.getHttpServer())
      .get('/api/v1/auth/me')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expectProblemDetails(res, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'unauthorized',
      instance: '/api/v1/auth/me',
      correlationId,
      detail: 'Unauthorized',
    });
  });

  it('returns http_unauthorized when calling /refresh without cookie', async () => {
    const correlationId = 'cid-auth-refresh-missing-cookie';

    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(CORRELATION_ID_HEADER, correlationId)
      .expect(401);

    expectProblemDetails(res, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'http_unauthorized',
      instance: '/api/v1/auth/refresh',
      correlationId,
      detail: 'Unauthorized',
    });
  });

  it('returns unauthorized when calling /refresh with invalid refresh token', async () => {
    const correlationId = 'cid-auth-refresh-invalid-cookie';

    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Cookie', 'refresh_token=invalid')
      .expect(401);

    expectProblemDetails(res, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'unauthorized',
      instance: '/api/v1/auth/refresh',
      correlationId,
      detail: 'Unauthorized',
    });
  });

  it('returns token_revoked when refreshing with a revoked session', async () => {
    const email = nextTestEmail();
    const password = 'password123';

    await registerUser(email, password);
    const { refreshCookie } = await loginUser(email, password);

    await request(app!.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', refreshCookie).expect(204);

    const correlationId = 'cid-auth-refresh-token-revoked';

    const res = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Cookie', refreshCookie)
      .expect(401);

    expectProblemDetails(res, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'token_revoked',
      instance: '/api/v1/auth/refresh',
      correlationId,
      detail: 'Refresh token revoked',
    });

    const setCookieHeader = res.headers['set-cookie'];
    const cookies = typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
    expect(cookies?.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('rotates refresh token and rejects replay of a previous refresh token', async () => {
    const email = nextTestEmail();
    const password = 'password123';

    await registerUser(email, password);
    const { refreshCookie } = await loginUser(email, password);

    const refreshRes = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    expect(refreshRes.body).toHaveProperty('accessToken');
    const rotatedRefreshCookie = extractRefreshCookie(refreshRes.headers['set-cookie']);
    expect(rotatedRefreshCookie).not.toBe(refreshCookie);

    const correlationId = 'cid-auth-refresh-replay-old-token';
    const replayRes = await request(app!.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Cookie', refreshCookie)
      .expect(401);

    expectProblemDetails(replayRes, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'token_revoked',
      instance: '/api/v1/auth/refresh',
      correlationId,
      detail: 'Refresh token revoked',
    });

    const setCookieHeader = replayRes.headers['set-cookie'];
    const cookies = typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
    expect(cookies?.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });
});
