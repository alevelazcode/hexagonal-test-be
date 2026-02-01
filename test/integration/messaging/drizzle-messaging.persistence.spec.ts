import { Conversation } from '@domain/messaging/conversation.entity';
import { Message } from '@domain/messaging/message.entity';
import { MessageContent } from '@domain/messaging/value-objects/message-content.value-object';
import { TelegramChatId } from '@domain/messaging/value-objects/telegram-chat-id.value-object';
import { DrizzleConversationRepository } from '@infrastructure/messaging/drizzle-conversation.repository';
import { DrizzleMessageRepository } from '@infrastructure/messaging/drizzle-message.repository';
import { DrizzleTelegramOffsetStore } from '@infrastructure/messaging/drizzle-telegram-offset.store';
import { describe, expect, it } from 'vitest';

import { createMigratedTestDb } from '../helpers/create-migrated-test-db';

describe('Messaging persistence (Drizzle + SQLite)', () => {
  it('persists and reads conversations by id and telegramChatId', async () => {
    const { db, cleanup } = await createMigratedTestDb();
    try {
      const repo = new DrizzleConversationRepository(db);

      const conversation = Conversation.create({
        id: 'c1',
        telegramChatId: TelegramChatId.create('123'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await repo.create(conversation);

      const byId = await repo.findById('c1');
      expect(byId?.id).toBe('c1');
      expect(byId?.telegramChatId.value).toBe('123');

      const byChat = await repo.findByTelegramChatId('123');
      expect(byChat?.id).toBe('c1');

      const updated = conversation.touch(new Date('2026-01-02T00:00:00.000Z'));
      await repo.update(updated);

      const afterUpdate = await repo.findById('c1');
      expect(afterUpdate?.lastMessageAt.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    } finally {
      await cleanup();
    }
  });

  it('persists and reads messages by conversationId and telegramUpdateId', async () => {
    const { db, cleanup } = await createMigratedTestDb();
    try {
      const conversationRepo = new DrizzleConversationRepository(db);
      const messageRepo = new DrizzleMessageRepository(db);

      const conversation = Conversation.create({
        id: 'c1',
        telegramChatId: TelegramChatId.create('123'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        lastMessageAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      await conversationRepo.create(conversation);

      const inbound = Message.create({
        id: 'm1',
        conversationId: 'c1',
        telegramChatId: TelegramChatId.create('123'),
        direction: 'inbound',
        content: MessageContent.create('hi'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        telegramUpdateId: 101,
        telegramMessageId: 201,
      });

      await messageRepo.create(inbound);

      const byUpdateId = await messageRepo.findByTelegramUpdateId(101);
      expect(byUpdateId?.id).toBe('m1');
      expect(byUpdateId?.telegramUpdateId).toBe(101);

      const list = await messageRepo.listByConversationId('c1');
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe('m1');
    } finally {
      await cleanup();
    }
  });

  it('stores and returns the telegram polling offset', async () => {
    const { db, cleanup } = await createMigratedTestDb();
    try {
      const store = new DrizzleTelegramOffsetStore(db);

      const initial = await store.getOffset();
      expect(initial).toBe(0);

      await store.setOffset(123);
      const after = await store.getOffset();
      expect(after).toBe(123);
    } finally {
      await cleanup();
    }
  });
});
