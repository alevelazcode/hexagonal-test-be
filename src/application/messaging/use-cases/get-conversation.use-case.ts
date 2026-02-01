import type { Conversation, Message } from '@domain/messaging';
import { ConversationNotFoundError } from '@domain/messaging/errors';
import type { ConversationRepositoryPort, MessageRepositoryPort } from '@domain/messaging/ports';

export interface GetConversationInput {
  conversationId: string;
}

export interface GetConversationResult {
  conversation: Conversation;
  messages: Message[];
}

export class GetConversationUseCase {
  constructor(
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly messageRepository: MessageRepositoryPort,
  ) {}

  async execute(input: GetConversationInput): Promise<GetConversationResult> {
    const conversation = await this.conversationRepository.findById(input.conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError('Conversation not found');
    }

    const messages = await this.messageRepository.listByConversationId(conversation.id);

    const sorted = [...messages].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
    );

    return {
      conversation,
      messages: sorted,
    };
  }
}
