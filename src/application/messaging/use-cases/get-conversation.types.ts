import type { Conversation, Message } from '@domain/messaging';

export interface GetConversationInput {
  conversationId: string;
}

export interface GetConversationResult {
  conversation: Conversation;
  messages: Message[];
}
