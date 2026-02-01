import { Conversation } from '@domain/messaging';
import type { ConversationRepositoryPort } from '@domain/messaging/ports';
import { TelegramChatId } from '@domain/messaging/value-objects';
import { DATABASE } from '@infrastructure/db/database.constants';
import type { Database } from '@infrastructure/db/database.module';
import { conversationTable } from '@infrastructure/db/schema';
import { Inject } from '@nestjs/common';
import { asc, desc, eq, sql } from 'drizzle-orm';

export class DrizzleConversationRepository implements ConversationRepositoryPort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(conversation: Conversation): Promise<void> {
    await this.db
      .insert(conversationTable)
      .values({
        id: conversation.id,
        telegramChatId: conversation.telegramChatId.value,
        createdAt: conversation.createdAt.toISOString(),
        lastMessageAt: conversation.lastMessageAt.toISOString(),
      })
      .run();
  }

  async update(conversation: Conversation): Promise<void> {
    await this.db
      .update(conversationTable)
      .set({
        telegramChatId: conversation.telegramChatId.value,
        createdAt: conversation.createdAt.toISOString(),
        lastMessageAt: conversation.lastMessageAt.toISOString(),
      })
      .where(eq(conversationTable.id, conversation.id))
      .run();
  }

  async findById(id: string): Promise<Conversation | null> {
    const row = await this.db.select().from(conversationTable).where(eq(conversationTable.id, id)).get();

    if (!row) {
      return null;
    }

    return Conversation.create({
      id: row.id,
      telegramChatId: TelegramChatId.create(row.telegramChatId),
      createdAt: new Date(row.createdAt),
      lastMessageAt: new Date(row.lastMessageAt),
    });
  }

  async findByTelegramChatId(telegramChatId: string): Promise<Conversation | null> {
    const row = await this.db
      .select()
      .from(conversationTable)
      .where(eq(conversationTable.telegramChatId, telegramChatId))
      .get();

    if (!row) {
      return null;
    }

    return Conversation.create({
      id: row.id,
      telegramChatId: TelegramChatId.create(row.telegramChatId),
      createdAt: new Date(row.createdAt),
      lastMessageAt: new Date(row.lastMessageAt),
    });
  }

  async list(input: { page: number; pageSize: number }): Promise<{ items: Conversation[]; total: number }> {
    const offset = (input.page - 1) * input.pageSize;

    const [rows, totalRow] = await Promise.all([
      this.db
        .select()
        .from(conversationTable)
        .orderBy(desc(conversationTable.lastMessageAt), asc(conversationTable.id))
        .limit(input.pageSize)
        .offset(offset)
        .all(),
      this.db
        .select({ total: sql<number>`count(*)` })
        .from(conversationTable)
        .get(),
    ]);

    const items = rows.map((row) =>
      Conversation.create({
        id: row.id,
        telegramChatId: TelegramChatId.create(row.telegramChatId),
        createdAt: new Date(row.createdAt),
        lastMessageAt: new Date(row.lastMessageAt),
      }),
    );

    return {
      items,
      total: totalRow?.total ?? 0,
    };
  }
}
