import { RefreshTokenSession } from '@domain/auth';
import type { RefreshTokenStorePort } from '@domain/auth/ports';
import { DATABASE } from '@infrastructure/db/database.constants';
import type { Database } from '@infrastructure/db/database.module';
import { refreshTokenSessionTable } from '@infrastructure/db/schema';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

export class DrizzleRefreshTokenStore implements RefreshTokenStorePort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(session: RefreshTokenSession, refreshTokenHash: string): Promise<void> {
    await this.db
      .insert(refreshTokenSessionTable)
      .values({
        id: session.id,
        userId: session.userId,
        tokenHash: refreshTokenHash,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        revokedAt: session.revokedAt?.toISOString(),
        replacedById: session.replacedById,
      })
      .run();
  }

  async findById(id: string): Promise<{
    session: RefreshTokenSession;
    refreshTokenHash: string;
  } | null> {
    const row = await this.db
      .select()
      .from(refreshTokenSessionTable)
      .where(eq(refreshTokenSessionTable.id, id))
      .get();

    if (!row) {
      return null;
    }

    const props = {
      id: row.id,
      userId: row.userId,
      createdAt: new Date(row.createdAt),
      expiresAt: new Date(row.expiresAt),
    };

    const session = RefreshTokenSession.create({
      ...props,
      ...(row.revokedAt ? { revokedAt: new Date(row.revokedAt) } : {}),
      ...(row.replacedById ? { replacedById: row.replacedById } : {}),
    });

    return {
      session,
      refreshTokenHash: row.tokenHash,
    };
  }

  async rotate(params: {
    oldSessionId: string;
    newSession: RefreshTokenSession;
    newRefreshTokenHash: string;
    revokedAt: Date;
  }): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(refreshTokenSessionTable)
        .set({
          revokedAt: params.revokedAt.toISOString(),
          replacedById: params.newSession.id,
        })
        .where(eq(refreshTokenSessionTable.id, params.oldSessionId))
        .run();

      await tx
        .insert(refreshTokenSessionTable)
        .values({
          id: params.newSession.id,
          userId: params.newSession.userId,
          tokenHash: params.newRefreshTokenHash,
          createdAt: params.newSession.createdAt.toISOString(),
          expiresAt: params.newSession.expiresAt.toISOString(),
          revokedAt: params.newSession.revokedAt?.toISOString(),
          replacedById: params.newSession.replacedById,
        })
        .run();
    });
  }

  async revoke(params: { sessionId: string; revokedAt: Date }): Promise<void> {
    await this.db
      .update(refreshTokenSessionTable)
      .set({
        revokedAt: params.revokedAt.toISOString(),
      })
      .where(eq(refreshTokenSessionTable.id, params.sessionId))
      .run();
  }
}
