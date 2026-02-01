import { ProcessTelegramUpdatesUseCase } from '@application/messaging/use-cases/process-telegram-updates.use-case';
import type { ClockPort } from '@domain/common/ports/clock.port';
import type { IdGeneratorPort } from '@domain/common/ports/id-generator.port';
import type { ConversationRepositoryPort } from '@domain/messaging/ports/conversation-repository.port';
import type { MessageRepositoryPort } from '@domain/messaging/ports/message-repository.port';
import type { ReplyGeneratorPort } from '@domain/messaging/ports/reply-generator.port';
import type { TelegramClientPort, TelegramUpdate } from '@domain/messaging/ports/telegram-client.port';
import type { TelegramOffsetStorePort } from '@domain/messaging/ports/telegram-offset-store.port';
import { describe, expect, it, vi } from 'vitest';

class SequenceIdGenerator implements IdGeneratorPort {
  private i = 0;
  generate(): string {
    this.i += 1;
    return `id-${this.i}`;
  }
}

class QueueClock implements ClockPort {
  constructor(private readonly queue: Date[]) {}

  now(): Date {
    const next = this.queue.shift();
    if (!next) {
      throw new Error('Clock queue exhausted');
    }

    return next;
  }
}

describe('ProcessTelegramUpdatesUseCase (unit)', () => {
  it('returns early when no updates exist (offset unchanged)', async () => {
    const telegramClient: TelegramClientPort = {
      getUpdates: vi.fn(() => Promise.resolve([])),
      sendMessage: vi.fn(() => Promise.resolve({ messageId: 1 })),
    };

    const offsetStore: TelegramOffsetStorePort = {
      getOffset: vi.fn(() => Promise.resolve(10)),
      setOffset: vi.fn(() => Promise.resolve(undefined)),
    };

    const conversationRepository: ConversationRepositoryPort = {
      create: vi.fn(() => Promise.resolve(undefined)),
      update: vi.fn(() => Promise.resolve(undefined)),
      findById: vi.fn(() => Promise.resolve(null)),
      findByTelegramChatId: vi.fn(() => Promise.resolve(null)),
      list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    };

    const messageRepository: MessageRepositoryPort = {
      create: vi.fn(() => Promise.resolve(undefined)),
      findByTelegramUpdateId: vi.fn(() => Promise.resolve(null)),
      listByConversationId: vi.fn(() => Promise.resolve([])),
    };

    const replyGenerator: ReplyGeneratorPort = {
      generate: vi.fn(() => Promise.resolve('ok')),
    };

    const useCase = new ProcessTelegramUpdatesUseCase(
      telegramClient,
      offsetStore,
      conversationRepository,
      messageRepository,
      replyGenerator,
      new SequenceIdGenerator(),
      new QueueClock([new Date('2026-01-01T00:00:00.000Z')]),
    );

    const result = await useCase.execute();

    expect(result).toEqual({
      processedUpdates: 0,
      savedInboundMessages: 0,
      sentReplies: 0,
      newOffset: 10,
    });

    expect(offsetStore.setOffset).not.toHaveBeenCalled();
    expect(telegramClient.sendMessage).not.toHaveBeenCalled();
  });

  it('persists inbound message, sends reply, and advances offset', async () => {
    const updates: TelegramUpdate[] = [
      {
        updateId: 101,
        message: {
          messageId: 201,
          chatId: '123',
          date: new Date('2026-01-01T00:00:00.000Z'),
          text: 'hi',
        },
      },
    ];

    const telegramClient: TelegramClientPort = {
      getUpdates: vi.fn(() => Promise.resolve(updates)),
      sendMessage: vi.fn(() => Promise.resolve({ messageId: 301 })),
    };

    const offsetStore: TelegramOffsetStorePort = {
      getOffset: vi.fn(() => Promise.resolve(0)),
      setOffset: vi.fn(() => Promise.resolve(undefined)),
    };

    const conversationRepository: ConversationRepositoryPort = {
      create: vi.fn(() => Promise.resolve(undefined)),
      update: vi.fn(() => Promise.resolve(undefined)),
      findById: vi.fn(() => Promise.resolve(null)),
      findByTelegramChatId: vi.fn(() => Promise.resolve(null)),
      list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    };

    const messageRepository: MessageRepositoryPort = {
      create: vi.fn(() => Promise.resolve(undefined)),
      findByTelegramUpdateId: vi.fn(() => Promise.resolve(null)),
      listByConversationId: vi.fn(() => Promise.resolve([])),
    };

    const replyGenerator: ReplyGeneratorPort = {
      generate: vi.fn(() => Promise.resolve('hello back')),
    };

    const useCase = new ProcessTelegramUpdatesUseCase(
      telegramClient,
      offsetStore,
      conversationRepository,
      messageRepository,
      replyGenerator,
      new SequenceIdGenerator(),
      new QueueClock([new Date('2026-01-01T00:00:01.000Z')]),
    );

    const result = await useCase.execute();

    expect(result.processedUpdates).toBe(1);
    expect(result.savedInboundMessages).toBe(1);
    expect(result.sentReplies).toBe(1);
    expect(result.newOffset).toBe(102);

    expect(conversationRepository.create).toHaveBeenCalledTimes(1);
    expect(messageRepository.create).toHaveBeenCalledTimes(2);
    expect(replyGenerator.generate).toHaveBeenCalledWith({
      chatId: '123',
      incomingText: 'hi',
    });

    expect(telegramClient.sendMessage).toHaveBeenCalledWith('123', 'hello back');
    expect(offsetStore.setOffset).toHaveBeenCalledWith(102);
  });
});
