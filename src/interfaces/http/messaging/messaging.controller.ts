import type {
  GetConversationUseCase,
  ListConversationsUseCase,
  ProcessTelegramUpdatesUseCase,
  SendMessageToChatUseCase,
} from '@application/messaging/use-cases';
import type { Conversation, Message } from '@domain/messaging';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { ProblemDetailsDto } from '../errors/problem-details';
import { ListConversationsQueryDto, SendMessageDto, TelegramSyncDto } from './dtos';
import {
  ConversationDto,
  GetConversationResponseDto,
  ListConversationsResponseDto,
  MessageDto,
  SendMessageResponseDto,
  TelegramSyncResponseDto,
} from './messaging.responses';
import {
  GET_CONVERSATION_USE_CASE,
  LIST_CONVERSATIONS_USE_CASE,
  PROCESS_TELEGRAM_UPDATES_USE_CASE,
  SEND_MESSAGE_TO_CHAT_USE_CASE,
} from './messaging.tokens';

@ApiTags('Messaging')
@Controller('messaging')
export class MessagingController {
  constructor(
    @Inject(LIST_CONVERSATIONS_USE_CASE)
    private readonly listConversations: ListConversationsUseCase,
    @Inject(GET_CONVERSATION_USE_CASE)
    private readonly getConversation: GetConversationUseCase,
    @Inject(SEND_MESSAGE_TO_CHAT_USE_CASE)
    private readonly sendMessageToChat: SendMessageToChatUseCase,
    @Inject(PROCESS_TELEGRAM_UPDATES_USE_CASE)
    private readonly processTelegramUpdates: ProcessTelegramUpdatesUseCase,
  ) {}

  private toConversationDto(input: Conversation): ConversationDto {
    return {
      id: input.id,
      telegramChatId: input.telegramChatId.value,
      createdAt: input.createdAt.toISOString(),
      lastMessageAt: input.lastMessageAt.toISOString(),
    };
  }

  private toMessageDto(input: Message): MessageDto {
    return {
      id: input.id,
      conversationId: input.conversationId,
      telegramChatId: input.telegramChatId.value,
      direction: input.direction,
      content: input.content.value,
      createdAt: input.createdAt.toISOString(),
      ...(input.telegramUpdateId !== undefined ? { telegramUpdateId: input.telegramUpdateId } : {}),
      ...(input.telegramMessageId !== undefined ? { telegramMessageId: input.telegramMessageId } : {}),
    };
  }

  @ApiOperation({ summary: 'List conversations' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: ListConversationsResponseDto })
  @ApiBadRequestResponse({ type: ProblemDetailsDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @Get('conversations')
  @UseGuards(JwtAccessGuard)
  async list(
    @Query(new ValidationPipe({ transform: true, expectedType: ListConversationsQueryDto }))
    query: ListConversationsQueryDto,
  ): Promise<ListConversationsResponseDto> {
    const out = await this.listConversations.execute(query);

    return {
      items: out.items.map((c) => this.toConversationDto(c)),
      page: out.page,
      pageSize: out.pageSize,
      total: out.total,
    };
  }

  @ApiOperation({ summary: 'Get conversation' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: GetConversationResponseDto })
  @ApiNotFoundResponse({ type: ProblemDetailsDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Get('conversations/:conversationId')
  @UseGuards(JwtAccessGuard)
  async get(@Param('conversationId') conversationId: string): Promise<GetConversationResponseDto> {
    const out = await this.getConversation.execute({ conversationId });

    return {
      conversation: this.toConversationDto(out.conversation),
      messages: out.messages.map((m) => this.toMessageDto(m)),
    };
  }

  @ApiOperation({ summary: 'Send message to conversation' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: SendMessageResponseDto })
  @ApiBadRequestResponse({ type: ProblemDetailsDto })
  @ApiNotFoundResponse({ type: ProblemDetailsDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Post('conversations/:conversationId/messages')
  @UseGuards(JwtAccessGuard)
  @HttpCode(200)
  async send(
    @Param('conversationId') conversationId: string,
    @Body(new ValidationPipe({ transform: true, expectedType: SendMessageDto })) dto: SendMessageDto,
  ): Promise<SendMessageResponseDto> {
    return this.sendMessageToChat.execute({
      conversationId,
      text: dto.text,
    });
  }

  @ApiOperation({ summary: 'Sync Telegram updates (manual trigger)' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: TelegramSyncResponseDto })
  @ApiBadRequestResponse({ type: ProblemDetailsDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Post('telegram/sync')
  @UseGuards(JwtAccessGuard)
  @HttpCode(200)
  async syncTelegram(
    @Body(new ValidationPipe({ transform: true, expectedType: TelegramSyncDto })) dto: TelegramSyncDto,
  ): Promise<TelegramSyncResponseDto> {
    return this.processTelegramUpdates.execute(dto);
  }
}
