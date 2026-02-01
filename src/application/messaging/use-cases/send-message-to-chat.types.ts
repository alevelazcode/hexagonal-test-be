export interface SendMessageToChatInput {
  conversationId: string;
  text: string;
}

export interface SendMessageToChatResult {
  messageId: string;
  telegramMessageId: number;
}
