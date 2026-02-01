import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  telegramChatId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  lastMessageAt!: string;
}

export class MessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  telegramChatId!: string;

  @ApiProperty({ enum: ['inbound', 'outbound'] })
  direction!: 'inbound' | 'outbound';

  @ApiProperty()
  content!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  telegramUpdateId?: number;

  @ApiPropertyOptional()
  telegramMessageId?: number;
}

export class ListConversationsResponseDto {
  @ApiProperty({ type: [ConversationDto] })
  items!: ConversationDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;
}

export class GetConversationResponseDto {
  @ApiProperty({ type: ConversationDto })
  conversation!: ConversationDto;

  @ApiProperty({ type: [MessageDto] })
  messages!: MessageDto[];
}

export class SendMessageResponseDto {
  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  telegramMessageId!: number;
}

export class TelegramSyncResponseDto {
  @ApiProperty()
  processedUpdates!: number;

  @ApiProperty()
  savedInboundMessages!: number;

  @ApiProperty()
  sentReplies!: number;

  @ApiProperty()
  newOffset!: number;
}
