import type { Conversation } from '../conversation.entity';

export interface ConversationRepositoryPort {
  create: (conversation: Conversation) => Promise<void>;
  update: (conversation: Conversation) => Promise<void>;
  findById: (id: string) => Promise<Conversation | null>;
  findByTelegramChatId: (telegramChatId: string) => Promise<Conversation | null>;
  list: () => Promise<Conversation[]>;
}
