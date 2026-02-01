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

class TestPasswordHasher implements PasswordHasherPort {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hash:${plain}`);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hash:${plain}`);
  }
}

class TestTelegramClient implements TelegramClientPort {
  private sent: { chatId: string; text: string }[] = [];

  private nextUpdates: TelegramUpdate[] | undefined;

  private nextMessageId = 1000;

  getUpdates(input?: {
    offset?: number;
    limit?: number;
    timeoutSeconds?: number;
  }): Promise<TelegramUpdate[]> {
    void input;

    if (this.nextUpdates) {
      const out = this.nextUpdates;
      this.nextUpdates = undefined;
      return Promise.resolve(out);
    }

    const offset = input?.offset ?? 0;
    if (offset > 1) {
      return Promise.resolve([]);
    }

    return Promise.resolve([
      {
        updateId: 1,
        message: {
          messageId: 10,
          chatId: '123',
          date: new Date('2020-01-01T00:00:00.000Z'),
          text: 'Hello',
        },
      },
    ]);
  }

  sendMessage(chatId: string, text: string): Promise<{ messageId: number }> {
    this.sent.push({ chatId, text });
    this.nextMessageId += 1;
    return Promise.resolve({ messageId: this.nextMessageId });
  }

  getSentMessages(): { chatId: string; text: string }[] {
    return [...this.sent];
  }

  setNextUpdates(updates: TelegramUpdate[]): void {
    this.nextUpdates = updates;
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

describe('Messaging (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let telegramClient: TestTelegramClient;

  async function registerAndLogin(): Promise<string> {
    const email = `user-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    const password = 'password123';

    await request(app!.getHttpServer()).post('/api/v1/auth/register').send({ email, password }).expect(201);

    const loginRes = await request(app!.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const body: unknown = loginRes.body;
    if (
      typeof body !== 'object' ||
      body === null ||
      !('accessToken' in body) ||
      typeof (body as Record<string, unknown>).accessToken !== 'string'
    ) {
      throw new Error('Invalid login response');
    }

    return (body as { accessToken: string }).accessToken;
  }

  beforeAll(async () => {
    telegramClient = new TestTelegramClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_PASSWORD_HASHER)
      .useValue(new TestPasswordHasher())
      .overrideProvider(MESSAGING_TELEGRAM_CLIENT)
      .useValue(telegramClient)
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

  it('sync -> list -> get -> send', async () => {
    const accessToken = await registerAndLogin();

    await request(app!.getHttpServer())
      .post('/api/v1/messaging/telegram/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ limit: 25, timeoutSeconds: 0 })
      .expect(200);

    const listRes = await request(app!.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listBody: unknown = listRes.body;
    if (
      typeof listBody !== 'object' ||
      listBody === null ||
      !('items' in listBody) ||
      !Array.isArray((listBody as Record<string, unknown>).items)
    ) {
      throw new Error('Invalid list conversations response');
    }

    const items = (listBody as { items: { id: string }[] }).items;
    expect(items.length).toBe(1);

    const conversationId = String(items[0]?.id);

    const getRes = await request(app!.getHttpServer())
      .get(`/api/v1/messaging/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const getBody: unknown = getRes.body;
    if (
      typeof getBody !== 'object' ||
      getBody === null ||
      !('messages' in getBody) ||
      !Array.isArray((getBody as Record<string, unknown>).messages)
    ) {
      throw new Error('Invalid get conversation response');
    }

    const messages = (getBody as { messages: unknown[] }).messages;
    expect(messages.length).toBeGreaterThanOrEqual(2);

    const sendRes = await request(app!.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: 'Admin says hi' })
      .expect(200);

    expect(sendRes.body).toHaveProperty('messageId');
    expect(sendRes.body).toHaveProperty('telegramMessageId');

    const sent = telegramClient.getSentMessages();
    expect(sent.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects unauthenticated requests', async () => {
    const correlationId = 'cid-messaging-unauthenticated';

    const res = await request(app!.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set(CORRELATION_ID_HEADER, correlationId)
      .expect(401);

    expectProblemDetails(res, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'http_unauthorized',
      instance: '/api/v1/messaging/conversations',
      correlationId,
      detail: 'Unauthorized',
    });
  });

  it('rejects invalid access tokens', async () => {
    const correlationId = 'cid-messaging-invalid-token';

    const res = await request(app!.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expectProblemDetails(res, {
      status: 401,
      title: 'Unauthorized',
      errorCode: 'unauthorized',
      instance: '/api/v1/messaging/conversations',
      correlationId,
      detail: 'Unauthorized',
    });
  });

  it('returns conversation_not_found when conversation does not exist', async () => {
    const accessToken = await registerAndLogin();
    const correlationId = 'cid-messaging-conversation-not-found';

    const res = await request(app!.getHttpServer())
      .get('/api/v1/messaging/conversations/does-not-exist')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expectProblemDetails(res, {
      status: 404,
      title: 'Not Found',
      errorCode: 'conversation_not_found',
      instance: '/api/v1/messaging/conversations/does-not-exist',
      correlationId,
      detail: 'Conversation not found',
    });
  });

  it('returns invalid_message_content when message text is only whitespace', async () => {
    const accessToken = await registerAndLogin();

    await request(app!.getHttpServer())
      .post('/api/v1/messaging/telegram/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ limit: 25, timeoutSeconds: 0 })
      .expect(200);

    const listRes = await request(app!.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listBody: unknown = listRes.body;
    if (
      typeof listBody !== 'object' ||
      listBody === null ||
      !('items' in listBody) ||
      !Array.isArray((listBody as Record<string, unknown>).items)
    ) {
      throw new Error('Invalid list conversations response');
    }

    const items = (listBody as { items: { id: string }[] }).items;
    const conversationId = String(items[0]?.id);

    const correlationId = 'cid-messaging-invalid-message-content';

    const res = await request(app!.getHttpServer())
      .post(`/api/v1/messaging/conversations/${conversationId}/messages`)
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: '   ' })
      .expect(400);

    expectProblemDetails(res, {
      status: 400,
      title: 'Bad Request',
      errorCode: 'invalid_message_content',
      instance: `/api/v1/messaging/conversations/${conversationId}/messages`,
      correlationId,
      detail: 'Invalid message content',
    });
  });

  it('returns conversation_not_found when sending to non-existent conversation', async () => {
    const accessToken = await registerAndLogin();
    const correlationId = 'cid-messaging-send-conversation-not-found';

    const res = await request(app!.getHttpServer())
      .post('/api/v1/messaging/conversations/does-not-exist/messages')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ text: 'hello' })
      .expect(404);

    expectProblemDetails(res, {
      status: 404,
      title: 'Not Found',
      errorCode: 'conversation_not_found',
      instance: '/api/v1/messaging/conversations/does-not-exist/messages',
      correlationId,
      detail: 'Conversation not found',
    });
  });

  it('returns invalid_telegram_chat_id when Telegram update contains invalid chat id', async () => {
    const accessToken = await registerAndLogin();
    const correlationId = 'cid-messaging-invalid-telegram-chat-id';

    telegramClient.setNextUpdates([
      {
        updateId: 999,
        message: {
          messageId: 10,
          chatId: 'abc',
          date: new Date('2020-01-01T00:00:00.000Z'),
          text: 'Hello',
        },
      },
    ]);

    const res = await request(app!.getHttpServer())
      .post('/api/v1/messaging/telegram/sync')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ limit: 25, timeoutSeconds: 0 })
      .expect(400);

    expectProblemDetails(res, {
      status: 400,
      title: 'Bad Request',
      errorCode: 'invalid_telegram_chat_id',
      instance: '/api/v1/messaging/telegram/sync',
      correlationId,
      detail: 'Invalid telegram chat id',
    });
  });

  it('returns http_bad_request for invalid telegram sync dto', async () => {
    const accessToken = await registerAndLogin();
    const correlationId = 'cid-messaging-invalid-sync-dto';

    const res = await request(app!.getHttpServer())
      .post('/api/v1/messaging/telegram/sync')
      .set(CORRELATION_ID_HEADER, correlationId)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ limit: 0, timeoutSeconds: 0 })
      .expect(400);

    expectProblemDetails(res, {
      status: 400,
      title: 'Bad Request',
      errorCode: 'http_bad_request',
      instance: '/api/v1/messaging/telegram/sync',
      correlationId,
      detail: 'Validation failed',
    });

    expect(res.body).toHaveProperty('errors');
  });

  it('does not duplicate messages when syncing the same Telegram update twice', async () => {
    const accessToken = await registerAndLogin();

    const updates: TelegramUpdate[] = [
      {
        updateId: 2000,
        message: {
          messageId: 777,
          chatId: '555',
          date: new Date('2020-01-01T00:00:00.000Z'),
          text: 'Hello idempotency',
        },
      },
    ];

    telegramClient.setNextUpdates(updates);
    const firstSync = await request(app!.getHttpServer())
      .post('/api/v1/messaging/telegram/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ limit: 25, timeoutSeconds: 0 })
      .expect(200);

    expect(firstSync.body).toMatchObject({
      processedUpdates: 1,
      savedInboundMessages: 1,
      sentReplies: 1,
    });

    telegramClient.setNextUpdates(updates);
    const secondSync = await request(app!.getHttpServer())
      .post('/api/v1/messaging/telegram/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ limit: 25, timeoutSeconds: 0 })
      .expect(200);

    expect(secondSync.body).toMatchObject({
      processedUpdates: 1,
      savedInboundMessages: 0,
      sentReplies: 0,
    });

    const listRes = await request(app!.getHttpServer())
      .get('/api/v1/messaging/conversations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listBody: unknown = listRes.body;
    if (
      typeof listBody !== 'object' ||
      listBody === null ||
      !('items' in listBody) ||
      !Array.isArray((listBody as Record<string, unknown>).items)
    ) {
      throw new Error('Invalid list conversations response');
    }

    const items = (listBody as { items: { id: string; telegramChatId: string }[] }).items;
    const conversationId = String(items.find((c) => c.telegramChatId === '555')?.id);
    if (!conversationId) {
      throw new Error('Expected conversation to exist');
    }

    const getRes = await request(app!.getHttpServer())
      .get(`/api/v1/messaging/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const getBody: unknown = getRes.body;
    if (
      typeof getBody !== 'object' ||
      getBody === null ||
      !('messages' in getBody) ||
      !Array.isArray((getBody as Record<string, unknown>).messages)
    ) {
      throw new Error('Invalid get conversation response');
    }

    const messages = (getBody as { messages: { telegramUpdateId?: number }[] }).messages;
    const inboundForUpdate = messages.filter((m) => m.telegramUpdateId === 2000);
    expect(inboundForUpdate).toHaveLength(1);
  });

  it('returns stable total and empty items when requesting a page beyond results', async () => {
    const accessToken = await registerAndLogin();

    await request(app!.getHttpServer())
      .post('/api/v1/messaging/telegram/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ limit: 25, timeoutSeconds: 0 })
      .expect(200);

    const page1 = await request(app!.getHttpServer())
      .get('/api/v1/messaging/conversations?page=1&pageSize=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const page1Body: unknown = page1.body;
    if (
      typeof page1Body !== 'object' ||
      page1Body === null ||
      !('total' in page1Body) ||
      typeof (page1Body as Record<string, unknown>).total !== 'number' ||
      !('items' in page1Body) ||
      !Array.isArray((page1Body as Record<string, unknown>).items)
    ) {
      throw new Error('Invalid list conversations response');
    }

    const total = (page1Body as { total: number }).total;
    const items = (page1Body as { items: unknown[] }).items;
    expect(items.length).toBeLessThanOrEqual(1);
    expect(total).toBeGreaterThanOrEqual(1);

    const beyond = await request(app!.getHttpServer())
      .get('/api/v1/messaging/conversations?page=999&pageSize=1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const beyondBody: unknown = beyond.body;
    if (
      typeof beyondBody !== 'object' ||
      beyondBody === null ||
      !('page' in beyondBody) ||
      typeof (beyondBody as Record<string, unknown>).page !== 'number' ||
      !('pageSize' in beyondBody) ||
      typeof (beyondBody as Record<string, unknown>).pageSize !== 'number' ||
      !('total' in beyondBody) ||
      typeof (beyondBody as Record<string, unknown>).total !== 'number' ||
      !('items' in beyondBody) ||
      !Array.isArray((beyondBody as Record<string, unknown>).items)
    ) {
      throw new Error('Invalid list conversations response');
    }

    expect(beyondBody).toMatchObject({
      page: 999,
      pageSize: 1,
      total,
    });

    const beyondItems = (beyondBody as { items: unknown[] }).items;
    expect(beyondItems).toHaveLength(0);
  });
});
