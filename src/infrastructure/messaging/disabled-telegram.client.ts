import type {
  GetUpdatesInput,
  SendMessageResult,
  TelegramClientPort,
  TelegramUpdate,
} from '@domain/messaging/ports/telegram-client.port';

export class DisabledTelegramClient implements TelegramClientPort {
  getUpdates(_input?: GetUpdatesInput): Promise<TelegramUpdate[]> {
    void _input;
    return Promise.reject(new Error('Telegram is not configured'));
  }

  sendMessage(_chatId: string, _text: string): Promise<SendMessageResult> {
    void _chatId;
    void _text;
    return Promise.reject(new Error('Telegram is not configured'));
  }
}
