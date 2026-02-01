import type { TokenServicePort } from '@domain/auth/ports/token-service.port';
import {
  CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthRequest } from '../auth.request';
import { AUTH_TOKEN_SERVICE } from '../auth.tokens';

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE)
    private readonly tokenService: TokenServicePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.header('authorization');

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized');
    }

    const token = header.slice('Bearer '.length).trim();
    if (token.length === 0) {
      throw new UnauthorizedException('Unauthorized');
    }

    const payload = await this.tokenService.verifyAccessToken(token);

    request.auth = {
      userId: payload.userId,
    };

    return true;
  }
}
