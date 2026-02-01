import { RefreshTokenSession } from '@domain/auth';
import { InvalidCredentialsError } from '@domain/auth/errors';
import type {
  ClockPort,
  IdGeneratorPort,
  PasswordHasherPort,
  RefreshTokenStorePort,
  TokenHasherPort,
  TokenServicePort,
  UserRepositoryPort,
} from '@domain/auth/ports';
import { Email, PlainPassword } from '@domain/auth/value-objects';

import type { LoginInput, LoginOutput } from './login.types';

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
    private readonly refreshTokenStore: RefreshTokenStorePort,
    private readonly tokenHasher: TokenHasherPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly accessTokenTtlMs: number,
    private readonly refreshTokenTtlMs: number,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const email = Email.create(input.email);
    const password = PlainPassword.create(input.password);

    const user = await this.userRepository.findByEmail(email.value);
    if (!user) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    const valid = await this.passwordHasher.compare(password.value, user.passwordHash.value);
    if (!valid) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    const now = this.clock.now();

    const session = RefreshTokenSession.create({
      id: this.idGenerator.generate(),
      userId: user.id,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.refreshTokenTtlMs),
    });

    const refreshToken = await this.tokenService.signRefreshToken(
      { userId: user.id, sessionId: session.id },
      this.refreshTokenTtlMs,
    );

    await this.refreshTokenStore.create(session, this.tokenHasher.hash(refreshToken));

    const accessToken = await this.tokenService.signAccessToken({ userId: user.id }, this.accessTokenTtlMs);

    return {
      accessToken,
      refreshToken,
    };
  }
}
