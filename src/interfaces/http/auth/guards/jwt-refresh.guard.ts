import type { TokenServicePort } from '@domain/auth/ports/token-service.port';
import {
  CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { REFRESH_TOKEN_COOKIE_NAME } from '../auth.constants';
import type { AuthRequest } from '../auth.request';
import { AUTH_TOKEN_SERVICE } from '../auth.tokens';

@Injectable()
export class JwtRefreshGuard implements CanActivate {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
      throw new UnauthorizedException('Unauthorized');
    }

    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    request.auth = {
      userId: payload.userId,
      sessionId: payload.sessionId,
      refreshToken,
    };

    return true;
  }
}
