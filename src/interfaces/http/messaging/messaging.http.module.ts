import {
  GetConversationUseCase,
  ListConversationsUseCase,
  ProcessTelegramUpdatesUseCase,
  SendMessageToChatUseCase,
} from '@application/messaging/use-cases';
import type { ClockPort, IdGeneratorPort } from '@domain/common/ports';
import type {
  ConversationRepositoryPort,
  MessageRepositoryPort,
  ReplyGeneratorPort,
  TelegramClientPort,
  TelegramOffsetStorePort,
} from '@domain/messaging/ports';
import { RandomUuidGenerator, SystemClock } from '@infrastructure/auth';
import { DatabaseModule } from '@infrastructure/db/database.module';
import {
  DisabledTelegramClient,
  DrizzleConversationRepository,
  DrizzleMessageRepository,
  DrizzleTelegramOffsetStore,
  EchoReplyGenerator,
  FallbackReplyGenerator,
  GeminiReplyGenerator,
  RandomReplyGenerator,
  TelegramHttpClient,
} from '@infrastructure/messaging';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@shared/config/env';

import { AuthHttpModule } from '../auth';
import { MessagingController } from './messaging.controller';
import {
  MESSAGING_CONVERSATION_REPOSITORY,
  MESSAGING_MESSAGE_REPOSITORY,
  MESSAGING_TELEGRAM_OFFSET_STORE,
} from './messaging.repository.tokens';
import {
  GET_CONVERSATION_USE_CASE,
  LIST_CONVERSATIONS_USE_CASE,
  MESSAGING_CLOCK,
  MESSAGING_ID_GENERATOR,
  MESSAGING_REPLY_GENERATOR,
  MESSAGING_TELEGRAM_CLIENT,
  PROCESS_TELEGRAM_UPDATES_USE_CASE,
  SEND_MESSAGE_TO_CHAT_USE_CASE,
} from './messaging.tokens';
import { TelegramPollingService } from './telegram-polling.service';

export function selectReplyGenerator(
  nodeEnv: Env['NODE_ENV'],
  apiKey: string | undefined,
): ReplyGeneratorPort {
  if (nodeEnv === 'test') {
    return new EchoReplyGenerator();
  }

  if (!apiKey) {
    return new RandomReplyGenerator();
  }

  return new FallbackReplyGenerator(new GeminiReplyGenerator(apiKey), new RandomReplyGenerator());
}

@Module({
  imports: [AuthHttpModule, DatabaseModule],
  controllers: [MessagingController],
  providers: [
    TelegramPollingService,
    {
      provide: MESSAGING_CONVERSATION_REPOSITORY,
      useClass: DrizzleConversationRepository,
    },
    {
      provide: MESSAGING_MESSAGE_REPOSITORY,
      useClass: DrizzleMessageRepository,
    },
    {
      provide: MESSAGING_TELEGRAM_OFFSET_STORE,
      useClass: DrizzleTelegramOffsetStore,
    },
    {
      provide: MESSAGING_REPLY_GENERATOR,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>): ReplyGeneratorPort => {
        const nodeEnv = configService.getOrThrow('NODE_ENV', { infer: true });
        const apiKey = configService.get('GEMINI_API_KEY', { infer: true });

        return selectReplyGenerator(nodeEnv, apiKey);
      },
    },
    {
      provide: MESSAGING_CLOCK,
      useClass: SystemClock,
    },
    {
      provide: MESSAGING_ID_GENERATOR,
      useClass: RandomUuidGenerator,
    },
    {
      provide: MESSAGING_TELEGRAM_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>): TelegramClientPort => {
        const token = configService.get('TELEGRAM_BOT_TOKEN', { infer: true });
        if (!token) {
          return new DisabledTelegramClient();
        }

        return new TelegramHttpClient(token);
      },
    },
    {
      provide: LIST_CONVERSATIONS_USE_CASE,
      inject: [MESSAGING_CONVERSATION_REPOSITORY],
      useFactory: (conversationRepository: ConversationRepositoryPort): ListConversationsUseCase =>
        new ListConversationsUseCase(conversationRepository),
    },
    {
      provide: GET_CONVERSATION_USE_CASE,
      inject: [MESSAGING_CONVERSATION_REPOSITORY, MESSAGING_MESSAGE_REPOSITORY],
      useFactory: (
        conversationRepository: ConversationRepositoryPort,
        messageRepository: MessageRepositoryPort,
      ): GetConversationUseCase => new GetConversationUseCase(conversationRepository, messageRepository),
    },
    {
      provide: SEND_MESSAGE_TO_CHAT_USE_CASE,
      inject: [
        MESSAGING_CONVERSATION_REPOSITORY,
        MESSAGING_MESSAGE_REPOSITORY,
        MESSAGING_TELEGRAM_CLIENT,
        MESSAGING_ID_GENERATOR,
        MESSAGING_CLOCK,
      ],
      useFactory: (
        conversationRepository: ConversationRepositoryPort,
        messageRepository: MessageRepositoryPort,
        telegramClient: TelegramClientPort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
      ): SendMessageToChatUseCase =>
        new SendMessageToChatUseCase(
          conversationRepository,
          messageRepository,
          telegramClient,
          idGenerator,
          clock,
        ),
    },
    {
      provide: PROCESS_TELEGRAM_UPDATES_USE_CASE,
      inject: [
        MESSAGING_TELEGRAM_CLIENT,
        MESSAGING_TELEGRAM_OFFSET_STORE,
        MESSAGING_CONVERSATION_REPOSITORY,
        MESSAGING_MESSAGE_REPOSITORY,
        MESSAGING_REPLY_GENERATOR,
        MESSAGING_ID_GENERATOR,
        MESSAGING_CLOCK,
      ],
      useFactory: (
        telegramClient: TelegramClientPort,
        offsetStore: TelegramOffsetStorePort,
        conversationRepository: ConversationRepositoryPort,
        messageRepository: MessageRepositoryPort,
        replyGenerator: ReplyGeneratorPort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
      ): ProcessTelegramUpdatesUseCase =>
        new ProcessTelegramUpdatesUseCase(
          telegramClient,
          offsetStore,
          conversationRepository,
          messageRepository,
          replyGenerator,
          idGenerator,
          clock,
        ),
    },
  ],
  exports: [
    LIST_CONVERSATIONS_USE_CASE,
    GET_CONVERSATION_USE_CASE,
    SEND_MESSAGE_TO_CHAT_USE_CASE,
    PROCESS_TELEGRAM_UPDATES_USE_CASE,
  ],
})
export class MessagingHttpModule {}
