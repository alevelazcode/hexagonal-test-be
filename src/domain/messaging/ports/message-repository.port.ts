import type { Message } from '../message.entity';

export interface MessageRepositoryPort {
  create: (message: Message) => Promise<void>;
  listByConversationId: (conversationId: string) => Promise<Message[]>;
  findByTelegramUpdateId: (telegramUpdateId: number) => Promise<Message | null>;
}
