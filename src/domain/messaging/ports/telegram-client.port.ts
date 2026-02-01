export interface TelegramMessage {
  messageId: number;
  chatId: string;
  date: Date;
  text?: string;
}

export interface TelegramUpdate {
  updateId: number;
  message?: TelegramMessage;
}

export interface GetUpdatesInput {
  offset?: number;
  limit?: number;
  timeoutSeconds?: number;
}

export interface SendMessageResult {
  messageId: number;
}

export interface TelegramClientPort {
  getUpdates: (input?: GetUpdatesInput) => Promise<TelegramUpdate[]>;
  sendMessage: (chatId: string, text: string) => Promise<SendMessageResult>;
}
