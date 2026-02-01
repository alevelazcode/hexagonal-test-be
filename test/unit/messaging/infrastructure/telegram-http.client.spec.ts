import { TelegramHttpClient } from '@infrastructure/messaging/telegram-http.client';
import { describe, expect, it, vi } from 'vitest';

describe('TelegramHttpClient', () => {
  it('maps getUpdates response into domain updates', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              ok: true,
              result: [
                {
                  update_id: 123,
                  message: {
                    message_id: 456,
                    chat: { id: 789 },
                    date: 1_700_000_000,
                    text: 'hi',
                  },
                },
              ],
            }),
          ),
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = new TelegramHttpClient('TEST_TOKEN', 'https://example.test');

    const updates = await client.getUpdates({ offset: 10, limit: 1, timeoutSeconds: 2 });

    expect(updates).toHaveLength(1);
    expect(updates[0]?.updateId).toBe(123);
    expect(updates[0]?.message?.messageId).toBe(456);
    expect(updates[0]?.message?.chatId).toBe('789');
    expect(updates[0]?.message?.text).toBe('hi');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/botTEST_TOKEN/getUpdates',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('maps sendMessage response into messageId', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              ok: true,
              result: {
                message_id: 999,
              },
            }),
          ),
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const client = new TelegramHttpClient('TEST_TOKEN', 'https://example.test');

    const result = await client.sendMessage('123', 'hello');
    expect(result.messageId).toBe(999);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/botTEST_TOKEN/sendMessage',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
