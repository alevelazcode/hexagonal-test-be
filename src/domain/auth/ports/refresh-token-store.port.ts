import type { RefreshTokenSession } from '../refresh-token-session.entity';

export interface RefreshTokenStorePort {
  create: (session: RefreshTokenSession, refreshTokenHash: string) => Promise<void>;
  findById: (id: string) => Promise<{
    session: RefreshTokenSession;
    refreshTokenHash: string;
  } | null>;
  rotate: (params: {
    oldSessionId: string;
    newSession: RefreshTokenSession;
    newRefreshTokenHash: string;
    revokedAt: Date;
  }) => Promise<void>;
  revoke: (params: { sessionId: string; revokedAt: Date }) => Promise<void>;
}
