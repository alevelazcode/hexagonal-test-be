import { InvalidTelegramChatIdError } from '@domain/messaging/errors/invalid-telegram-chat-id.error';
import { TelegramChatId } from '@domain/messaging/value-objects/telegram-chat-id.value-object';
import { describe, expect, it } from 'vitest';

describe('TelegramChatId', () => {
  it('accepts numeric chat id strings', () => {
    const value = TelegramChatId.create('123');
    expect(value.value).toBe('123');
  });

  it('accepts negative numeric chat id strings (groups)', () => {
    const value = TelegramChatId.create('-123');
    expect(value.value).toBe('-123');
  });

  it('rejects non-numeric chat id strings', () => {
    expect(() => TelegramChatId.create('abc')).toThrow(InvalidTelegramChatIdError);
  });
});
