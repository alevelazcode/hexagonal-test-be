import type {
  GetUpdatesInput,
  SendMessageResult,
  TelegramClientPort,
  TelegramUpdate,
} from '@domain/messaging/ports/telegram-client.port';
import { z } from 'zod';

import {
  TELEGRAM_API_BASE_URL,
  TELEGRAM_GET_UPDATES_METHOD,
  TELEGRAM_SEND_MESSAGE_METHOD,
  telegramApiResponseSchema,
  type TelegramGetUpdatesRequest,
  telegramGetUpdatesResultItemSchema,
  type TelegramSendMessageRequest,
  telegramSendMessageResultSchema,
} from './telegram-api';

async function parseTelegramResponse<TResult>(
  response: Response,
  resultSchema: z.ZodType<TResult>,
  fallbackErrorMessage: string,
): Promise<TResult> {
  if (!response.ok) {
    throw new Error(`${fallbackErrorMessage} with status ${response.status}`);
  }

  const text = await response.text();
  const parsedJson = JSON.parse(text) as unknown;

  const data = telegramApiResponseSchema(resultSchema).parse(parsedJson);
  if (!data.ok) {
    throw new Error(data.description ?? fallbackErrorMessage);
  }

  return data.result;
}

export class TelegramHttpClient implements TelegramClientPort {
  constructor(
    private readonly botToken: string,
    private readonly baseUrl: string = TELEGRAM_API_BASE_URL,
  ) {}

  async getUpdates(input?: GetUpdatesInput): Promise<TelegramUpdate[]> {
    const payload: TelegramGetUpdatesRequest = {};

    if (input?.offset !== undefined) {
      payload.offset = input.offset;
    }
    if (input?.limit !== undefined) {
      payload.limit = input.limit;
    }
    if (input?.timeoutSeconds !== undefined) {
      payload.timeout = input.timeoutSeconds;
    }

    const response = await fetch(`${this.baseUrl}/bot${this.botToken}/${TELEGRAM_GET_UPDATES_METHOD}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resultItems = await parseTelegramResponse(
      response,
      z.array(telegramGetUpdatesResultItemSchema),
      'Telegram getUpdates failed',
    );

    return resultItems.map((u) => {
      const base: TelegramUpdate = {
        updateId: u.update_id,
      };

      if (!u.message) {
        return base;
      }

      return {
        ...base,
        message: {
          messageId: u.message.message_id,
          chatId: String(u.message.chat.id),
          date: new Date(u.message.date * 1000),
          ...(u.message.text !== undefined ? { text: u.message.text } : {}),
        },
      };
    });
  }

  async sendMessage(chatId: string, text: string): Promise<SendMessageResult> {
    const payload: TelegramSendMessageRequest = {
      chat_id: chatId,
      text,
    };

    const response = await fetch(`${this.baseUrl}/bot${this.botToken}/${TELEGRAM_SEND_MESSAGE_METHOD}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await parseTelegramResponse(
      response,
      telegramSendMessageResultSchema,
      'Telegram sendMessage failed',
    );

    return {
      messageId: result.message_id,
    } satisfies SendMessageResult;
  }
}
