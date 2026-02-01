export interface GenerateReplyInput {
  chatId: string;
  incomingText: string;
}

export interface ReplyGeneratorPort {
  generate: (input: GenerateReplyInput) => Promise<string>;
}
