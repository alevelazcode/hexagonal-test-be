export interface TelegramOffsetStorePort {
  getOffset: () => Promise<number>;
  setOffset: (offset: number) => Promise<void>;
}
