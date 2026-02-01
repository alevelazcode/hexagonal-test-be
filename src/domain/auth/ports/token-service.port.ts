export interface AccessTokenPayload {
  userId: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export interface TokenServicePort {
  signAccessToken: (payload: AccessTokenPayload, ttlMs: number) => Promise<string>;
  signRefreshToken: (payload: RefreshTokenPayload, ttlMs: number) => Promise<string>;
  verifyAccessToken: (token: string) => Promise<AccessTokenPayload>;
  verifyRefreshToken: (token: string) => Promise<RefreshTokenPayload>;
}
