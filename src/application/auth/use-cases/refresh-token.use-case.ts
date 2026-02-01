import { RefreshTokenSession } from '@domain/auth';
import { TokenRevokedError } from '@domain/auth/errors';
import type {
  ClockPort,
  IdGeneratorPort,
  RefreshTokenStorePort,
  TokenHasherPort,
  TokenServicePort,
} from '@domain/auth/ports';

import type { RefreshTokenInput, RefreshTokenOutput } from './refresh-token.types';

export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokenStore: RefreshTokenStorePort,
    private readonly tokenHasher: TokenHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly accessTokenTtlMs: number,
    private readonly refreshTokenTtlMs: number,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const record = await this.refreshTokenStore.findById(input.sessionId);

    if (!record) {
      throw new TokenRevokedError('Refresh token revoked');
    }

    const { session, refreshTokenHash } = record;

    if (session.userId !== input.userId) {
      throw new TokenRevokedError('Refresh token revoked');
    }

    const now = this.clock.now();

    if (session.revokedAt) {
      throw new TokenRevokedError('Refresh token revoked');
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      throw new TokenRevokedError('Refresh token expired');
    }

    const incomingHash = this.tokenHasher.hash(input.refreshToken);
    if (incomingHash !== refreshTokenHash) {
      throw new TokenRevokedError('Refresh token revoked');
    }

    const newSession = RefreshTokenSession.create({
      id: this.idGenerator.generate(),
      userId: input.userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.refreshTokenTtlMs),
    });

    const newRefreshToken = await this.tokenService.signRefreshToken(
      { userId: input.userId, sessionId: newSession.id },
      this.refreshTokenTtlMs,
    );

    const newAccessToken = await this.tokenService.signAccessToken(
      { userId: input.userId },
      this.accessTokenTtlMs,
    );

    await this.refreshTokenStore.rotate({
      oldSessionId: session.id,
      newSession,
      newRefreshTokenHash: this.tokenHasher.hash(newRefreshToken),
      revokedAt: now,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
