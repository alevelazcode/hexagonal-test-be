import {
  GetMeUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
} from '@application/auth/use-cases';
import type {
  ClockPort,
  IdGeneratorPort,
  PasswordHasherPort,
  RefreshTokenStorePort,
  TokenHasherPort,
  TokenServicePort,
  UserRepositoryPort,
} from '@domain/auth/ports';
import {
  BcryptPasswordHasher,
  DrizzleRefreshTokenStore,
  DrizzleUserRepository,
  JwtTokenService,
  RandomUuidGenerator,
  Sha256TokenHasher,
  SystemClock,
} from '@infrastructure/auth';
import { DatabaseModule } from '@infrastructure/db/database.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@shared/config/env';

import { AuthController } from './auth.controller';
import { AUTH_REFRESH_TOKEN_STORE, AUTH_USER_REPOSITORY } from './auth.repository.tokens';
import {
  AUTH_CLOCK,
  AUTH_ID_GENERATOR,
  AUTH_PASSWORD_HASHER,
  AUTH_TOKEN_HASHER,
  AUTH_TOKEN_SERVICE,
  GET_ME_USE_CASE,
  LOGIN_USE_CASE,
  LOGOUT_USE_CASE,
  REFRESH_TOKEN_USE_CASE,
  REGISTER_USER_USE_CASE,
} from './auth.tokens';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    JwtAccessGuard,
    JwtRefreshGuard,
    {
      provide: AUTH_USER_REPOSITORY,
      useClass: DrizzleUserRepository,
    },
    {
      provide: AUTH_REFRESH_TOKEN_STORE,
      useClass: DrizzleRefreshTokenStore,
    },
    {
      provide: AUTH_PASSWORD_HASHER,
      useFactory: () => new BcryptPasswordHasher(12),
    },
    {
      provide: AUTH_TOKEN_HASHER,
      useClass: Sha256TokenHasher,
    },
    {
      provide: AUTH_CLOCK,
      useClass: SystemClock,
    },
    {
      provide: AUTH_ID_GENERATOR,
      useClass: RandomUuidGenerator,
    },
    {
      provide: AUTH_TOKEN_SERVICE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>): TokenServicePort => {
        const accessSecret = configService.getOrThrow('JWT_ACCESS_SECRET', {
          infer: true,
        });
        const refreshSecret = configService.getOrThrow('JWT_REFRESH_SECRET', {
          infer: true,
        });

        return new JwtTokenService(accessSecret, refreshSecret);
      },
    },
    {
      provide: REGISTER_USER_USE_CASE,
      inject: [AUTH_USER_REPOSITORY, AUTH_PASSWORD_HASHER, AUTH_ID_GENERATOR, AUTH_CLOCK],
      useFactory: (
        userRepository: UserRepositoryPort,
        passwordHasher: PasswordHasherPort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
      ): RegisterUserUseCase => new RegisterUserUseCase(userRepository, passwordHasher, idGenerator, clock),
    },
    {
      provide: LOGIN_USE_CASE,
      inject: [
        AUTH_USER_REPOSITORY,
        AUTH_PASSWORD_HASHER,
        AUTH_TOKEN_SERVICE,
        AUTH_REFRESH_TOKEN_STORE,
        AUTH_TOKEN_HASHER,
        AUTH_ID_GENERATOR,
        AUTH_CLOCK,
        ConfigService,
      ],
      useFactory: (
        userRepository: UserRepositoryPort,
        passwordHasher: PasswordHasherPort,
        tokenService: TokenServicePort,
        refreshTokenStore: RefreshTokenStorePort,
        tokenHasher: TokenHasherPort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        configService: ConfigService<Env>,
      ): LoginUseCase => {
        const accessTokenTtlMs = configService.getOrThrow('ACCESS_TOKEN_TTL', {
          infer: true,
        });
        const refreshTokenTtlMs = configService.getOrThrow('REFRESH_TOKEN_TTL', {
          infer: true,
        });

        return new LoginUseCase(
          userRepository,
          passwordHasher,
          tokenService,
          refreshTokenStore,
          tokenHasher,
          idGenerator,
          clock,
          accessTokenTtlMs,
          refreshTokenTtlMs,
        );
      },
    },
    {
      provide: REFRESH_TOKEN_USE_CASE,
      inject: [
        AUTH_REFRESH_TOKEN_STORE,
        AUTH_TOKEN_HASHER,
        AUTH_TOKEN_SERVICE,
        AUTH_ID_GENERATOR,
        AUTH_CLOCK,
        ConfigService,
      ],
      useFactory: (
        refreshTokenStore: RefreshTokenStorePort,
        tokenHasher: TokenHasherPort,
        tokenService: TokenServicePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        configService: ConfigService<Env>,
      ): RefreshTokenUseCase => {
        const accessTokenTtlMs = configService.getOrThrow('ACCESS_TOKEN_TTL', {
          infer: true,
        });
        const refreshTokenTtlMs = configService.getOrThrow('REFRESH_TOKEN_TTL', {
          infer: true,
        });

        return new RefreshTokenUseCase(
          refreshTokenStore,
          tokenHasher,
          tokenService,
          idGenerator,
          clock,
          accessTokenTtlMs,
          refreshTokenTtlMs,
        );
      },
    },
    {
      provide: LOGOUT_USE_CASE,
      inject: [AUTH_REFRESH_TOKEN_STORE, AUTH_CLOCK],
      useFactory: (refreshTokenStore: RefreshTokenStorePort, clock: ClockPort): LogoutUseCase =>
        new LogoutUseCase(refreshTokenStore, clock),
    },
    {
      provide: GET_ME_USE_CASE,
      inject: [AUTH_USER_REPOSITORY],
      useFactory: (userRepository: UserRepositoryPort): GetMeUseCase => new GetMeUseCase(userRepository),
    },
  ],
  exports: [AUTH_TOKEN_SERVICE, JwtAccessGuard, JwtRefreshGuard],
})
export class AuthHttpModule {}
