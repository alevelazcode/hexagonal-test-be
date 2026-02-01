export type TelegramApiResponse<TResult> =
  | {
      ok: true;
      result: TResult;
    }
  | {
      ok: false;
      description?: string | undefined;
    };

export interface TelegramGetUpdatesResultItem {
  update_id: number;
  message?:
    | {
        message_id: number;
        chat: {
          id: number;
        };
        date: number;
        text?: string | undefined;
      }
    | undefined;
}

export interface TelegramSendMessageResult {
  message_id: number;
}

export interface TelegramGetUpdatesRequest {
  offset?: number;
  limit?: number;
  timeout?: number;
}

export interface TelegramSendMessageRequest {
  chat_id: string;
  text: string;
}
