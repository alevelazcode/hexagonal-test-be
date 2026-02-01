import type { ClockPort, RefreshTokenStorePort } from '@domain/auth/ports';

export interface LogoutInput {
  sessionId: string;
}

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenStore: RefreshTokenStorePort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    await this.refreshTokenStore.revoke({
      sessionId: input.sessionId,
      revokedAt: this.clock.now(),
    });
  }
}
