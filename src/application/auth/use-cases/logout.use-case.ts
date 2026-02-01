import type { ClockPort, RefreshTokenStorePort } from '@domain/auth/ports';

import type { LogoutInput } from './logout.types';

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
