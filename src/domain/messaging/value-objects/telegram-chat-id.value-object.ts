import { InvalidTelegramChatIdError } from '../errors/invalid-telegram-chat-id.error';

export class TelegramChatId {
  private constructor(private readonly raw: string) {}

  static create(input: string): TelegramChatId {
    const normalized = input.trim();

    if (normalized.length === 0) {
      throw new InvalidTelegramChatIdError('Invalid telegram chat id');
    }

    if (!/^-?\d+$/.test(normalized)) {
      throw new InvalidTelegramChatIdError('Invalid telegram chat id');
    }

    return new TelegramChatId(normalized);
  }

  get value(): string {
    return this.raw;
  }

  toString(): string {
    return this.raw;
  }
}
