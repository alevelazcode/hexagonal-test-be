import type { Conversation } from '../conversation.entity';

export interface ListConversationsParams {
  page: number;
  pageSize: number;
}

export interface ListConversationsResult {
  items: Conversation[];
  total: number;
}

export interface ConversationRepositoryPort {
  create: (conversation: Conversation) => Promise<void>;
  update: (conversation: Conversation) => Promise<void>;
  findById: (id: string) => Promise<Conversation | null>;
  findByTelegramChatId: (telegramChatId: string) => Promise<Conversation | null>;
  list: (input: ListConversationsParams) => Promise<ListConversationsResult>;
}
