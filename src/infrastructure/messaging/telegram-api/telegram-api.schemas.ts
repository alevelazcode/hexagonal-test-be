import { z } from 'zod';

import type {
  TelegramApiResponse,
  TelegramGetUpdatesResultItem,
  TelegramSendMessageResult,
} from './telegram-api.types';

export function telegramApiResponseSchema<TResult>(
  resultSchema: z.ZodType<TResult>,
): z.ZodType<TelegramApiResponse<TResult>> {
  return z.discriminatedUnion('ok', [
    z.object({
      ok: z.literal(true),
      result: resultSchema,
    }),
    z.object({
      ok: z.literal(false),
      description: z.string().optional(),
    }),
  ]);
}

export const telegramGetUpdatesResultItemSchema: z.ZodType<TelegramGetUpdatesResultItem> = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      message_id: z.number().int(),
      chat: z.object({
        id: z.number().int(),
      }),
      date: z.number().int(),
      text: z.string().optional(),
    })
    .optional(),
});

export const telegramSendMessageResultSchema: z.ZodType<TelegramSendMessageResult> = z.object({
  message_id: z.number().int(),
});
