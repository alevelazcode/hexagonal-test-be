import type { ClockPort, DomainEventPublisherPort, IdGeneratorPort } from '@domain/common/ports';
import { Conversation, Message } from '@domain/messaging';
import { MessageReceivedEvent } from '@domain/messaging/events/message-received.event';
import type {
  ConversationRepositoryPort,
  GetUpdatesInput,
  MessageRepositoryPort,
  ReplyGeneratorPort,
  TelegramClientPort,
  TelegramOffsetStorePort,
  TelegramUpdate,
} from '@domain/messaging/ports';
import { MessageContent, TelegramChatId } from '@domain/messaging/value-objects';

import type {
  ProcessTelegramUpdatesInput,
  ProcessTelegramUpdatesResult,
} from './process-telegram-updates.types';

function getTextUpdates(updates: TelegramUpdate[]): TelegramUpdate[] {
  return updates.filter((u) => typeof u.message?.text === 'string' && u.message.text.trim().length > 0);
}

export class ProcessTelegramUpdatesUseCase {
  constructor(
    private readonly telegramClient: TelegramClientPort,
    private readonly offsetStore: TelegramOffsetStorePort,
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly messageRepository: MessageRepositoryPort,
    private readonly replyGenerator: ReplyGeneratorPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly domainEventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(input?: ProcessTelegramUpdatesInput): Promise<ProcessTelegramUpdatesResult> {
    const offset = await this.offsetStore.getOffset();

    const getUpdatesInput: GetUpdatesInput = { offset };
    if (input?.limit !== undefined) {
      getUpdatesInput.limit = input.limit;
    }
    if (input?.timeoutSeconds !== undefined) {
      getUpdatesInput.timeoutSeconds = input.timeoutSeconds;
    }

    const updates = await this.telegramClient.getUpdates(getUpdatesInput);

    const textUpdates = getTextUpdates(updates);

    if (updates.length === 0) {
      return {
        processedUpdates: 0,
        savedInboundMessages: 0,
        sentReplies: 0,
        newOffset: offset,
      };
    }

    const firstUpdate = updates[0];
    if (!firstUpdate) {
      return {
        processedUpdates: 0,
        savedInboundMessages: 0,
        sentReplies: 0,
        newOffset: offset,
      };
    }

    let maxUpdateId = firstUpdate.updateId;
    for (const u of updates) {
      if (u.updateId > maxUpdateId) {
        maxUpdateId = u.updateId;
      }
    }
    const newOffset = maxUpdateId + 1;

    let savedInboundMessages = 0;
    let sentReplies = 0;

    for (const update of textUpdates) {
      const message = update.message;
      if (!message) {
        continue;
      }

      const alreadyProcessed = await this.messageRepository.findByTelegramUpdateId(update.updateId);
      if (alreadyProcessed) {
        continue;
      }

      const chatId = TelegramChatId.create(message.chatId);

      const now = this.clock.now();

      const existingConversation = await this.conversationRepository.findByTelegramChatId(chatId.value);

      const conversation =
        existingConversation ??
        Conversation.create({
          id: this.idGenerator.generate(),
          telegramChatId: chatId,
          createdAt: now,
          lastMessageAt: message.date,
        });

      if (!existingConversation) {
        await this.conversationRepository.create(conversation);
      }

      const inboundContent = MessageContent.create(message.text ?? '');

      const inbound = Message.create({
        id: this.idGenerator.generate(),
        conversationId: conversation.id,
        telegramChatId: chatId,
        direction: 'inbound',
        content: inboundContent,
        createdAt: message.date,
        telegramUpdateId: update.updateId,
        telegramMessageId: message.messageId,
      });

      await this.messageRepository.create(inbound);
      savedInboundMessages += 1;

      await this.domainEventPublisher.publish(
        new MessageReceivedEvent({
          messageId: inbound.id,
          conversationId: conversation.id,
          telegramChatId: chatId.value,
          telegramUpdateId: update.updateId,
          text: inboundContent.value,
          receivedAt: message.date,
        }),
      );

      const touched = conversation.touch(message.date);
      await this.conversationRepository.update(touched);

      const replyText = await this.replyGenerator.generate({
        chatId: chatId.value,
        incomingText: inboundContent.value,
      });

      const replyContent = MessageContent.create(replyText);

      const sent = await this.telegramClient.sendMessage(chatId.value, replyContent.value);
      sentReplies += 1;

      const outbound = Message.create({
        id: this.idGenerator.generate(),
        conversationId: conversation.id,
        telegramChatId: chatId,
        direction: 'outbound',
        content: replyContent,
        createdAt: now,
        telegramMessageId: sent.messageId,
      });

      await this.messageRepository.create(outbound);

      const touchedAgain = touched.touch(outbound.createdAt);
      await this.conversationRepository.update(touchedAgain);
    }

    await this.offsetStore.setOffset(newOffset);

    return {
      processedUpdates: updates.length,
      savedInboundMessages,
      sentReplies,
      newOffset,
    };
  }
}
