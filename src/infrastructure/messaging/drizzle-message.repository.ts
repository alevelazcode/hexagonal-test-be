import { Message, type MessageDirection } from '@domain/messaging';
import type { MessageRepositoryPort } from '@domain/messaging/ports';
import { MessageContent, TelegramChatId } from '@domain/messaging/value-objects';
import { DATABASE } from '@infrastructure/db/database.constants';
import type { Database } from '@infrastructure/db/database.module';
import { messageTable } from '@infrastructure/db/schema';
import { Inject } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

export class DrizzleMessageRepository implements MessageRepositoryPort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(message: Message): Promise<void> {
    await this.db
      .insert(messageTable)
      .values({
        id: message.id,
        conversationId: message.conversationId,
        telegramChatId: message.telegramChatId.value,
        direction: message.direction,
        content: message.content.value,
        createdAt: message.createdAt.toISOString(),
        telegramUpdateId: message.telegramUpdateId,
        telegramMessageId: message.telegramMessageId,
      })
      .run();
  }

  async listByConversationId(conversationId: string): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messageTable)
      .where(eq(messageTable.conversationId, conversationId))
      .orderBy(asc(messageTable.createdAt), asc(messageTable.id))
      .all();

    return rows.map((row) => {
      const base = {
        id: row.id,
        conversationId: row.conversationId,
        telegramChatId: TelegramChatId.create(row.telegramChatId),
        direction: row.direction as MessageDirection,
        content: MessageContent.create(row.content),
        createdAt: new Date(row.createdAt),
      };

      return Message.create({
        ...base,
        ...(row.telegramUpdateId !== null ? { telegramUpdateId: row.telegramUpdateId } : {}),
        ...(row.telegramMessageId !== null ? { telegramMessageId: row.telegramMessageId } : {}),
      });
    });
  }

  async findByTelegramUpdateId(telegramUpdateId: number): Promise<Message | null> {
    const row = await this.db
      .select()
      .from(messageTable)
      .where(eq(messageTable.telegramUpdateId, telegramUpdateId))
      .get();

    if (!row) {
      return null;
    }

    const base = {
      id: row.id,
      conversationId: row.conversationId,
      telegramChatId: TelegramChatId.create(row.telegramChatId),
      direction: row.direction as MessageDirection,
      content: MessageContent.create(row.content),
      createdAt: new Date(row.createdAt),
    };

    return Message.create({
      ...base,
      ...(row.telegramUpdateId !== null ? { telegramUpdateId: row.telegramUpdateId } : {}),
      ...(row.telegramMessageId !== null ? { telegramMessageId: row.telegramMessageId } : {}),
    });
  }
}
