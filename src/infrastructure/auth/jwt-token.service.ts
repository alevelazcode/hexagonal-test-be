import { UnauthorizedError } from '@domain/auth/errors';
import type { AccessTokenPayload, RefreshTokenPayload, TokenServicePort } from '@domain/auth/ports';
import { sign, verify } from 'jsonwebtoken';
import { z } from 'zod';

const accessTokenPayloadSchema = z.object({
  userId: z.string().min(1),
});

const refreshTokenPayloadSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().min(1),
});

function toExpiresInSeconds(ttlMs: number): number {
  return Math.floor(ttlMs / 1000);
}

export class JwtTokenService implements TokenServicePort {
  constructor(
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
  ) {}

  signAccessToken(payload: AccessTokenPayload, ttlMs: number): Promise<string> {
    return Promise.resolve<string>(
      sign(payload, this.accessSecret, {
        algorithm: 'HS256',
        expiresIn: toExpiresInSeconds(ttlMs),
      }),
    );
  }

  signRefreshToken(payload: RefreshTokenPayload, ttlMs: number): Promise<string> {
    return Promise.resolve<string>(
      sign(payload, this.refreshSecret, {
        algorithm: 'HS256',
        expiresIn: toExpiresInSeconds(ttlMs),
      }),
    );
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const decoded = verify(token, this.accessSecret, { algorithms: ['HS256'] });
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Unauthorized');
      }

      const parsed = accessTokenPayloadSchema.safeParse(decoded);
      if (!parsed.success) {
        throw new UnauthorizedError('Unauthorized');
      }

      return Promise.resolve<AccessTokenPayload>({ userId: parsed.data.userId });
    } catch {
      return Promise.reject(new UnauthorizedError('Unauthorized'));
    }
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const decoded = verify(token, this.refreshSecret, { algorithms: ['HS256'] });
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Unauthorized');
      }

      const parsed = refreshTokenPayloadSchema.safeParse(decoded);
      if (!parsed.success) {
        throw new UnauthorizedError('Unauthorized');
      }

      return Promise.resolve({
        userId: parsed.data.userId,
        sessionId: parsed.data.sessionId,
      });
    } catch {
      return Promise.reject(new UnauthorizedError('Unauthorized'));
    }
  }
}
