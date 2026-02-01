import type { TelegramOffsetStorePort } from '@domain/messaging/ports/telegram-offset-store.port';
import { DATABASE } from '@infrastructure/db/database.constants';
import type { Database } from '@infrastructure/db/database.module';
import { telegramOffsetTable } from '@infrastructure/db/schema';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

const DEFAULT_ROW_ID = 'default';

export class DrizzleTelegramOffsetStore implements TelegramOffsetStorePort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async getOffset(): Promise<number> {
    const row = await this.db
      .select()
      .from(telegramOffsetTable)
      .where(eq(telegramOffsetTable.id, DEFAULT_ROW_ID))
      .get();

    return row?.offset ?? 0;
  }

  async setOffset(offset: number): Promise<void> {
    const updatedAt = new Date().toISOString();

    await this.db
      .insert(telegramOffsetTable)
      .values({
        id: DEFAULT_ROW_ID,
        offset,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: telegramOffsetTable.id,
        set: {
          offset,
          updatedAt,
        },
      })
      .run();
  }
}
