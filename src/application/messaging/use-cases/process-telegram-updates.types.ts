export interface ProcessTelegramUpdatesInput {
  limit?: number;
  timeoutSeconds?: number;
}

export interface ProcessTelegramUpdatesResult {
  processedUpdates: number;
  savedInboundMessages: number;
  sentReplies: number;
  newOffset: number;
}
