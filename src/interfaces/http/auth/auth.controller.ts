import type {
  GetMeUseCase,
  LoginUseCase,
  LogoutUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
} from '@application/auth/use-cases';
import { TokenRevokedError } from '@domain/auth/errors';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Env } from '@shared/config/env';
import type { CookieOptions, Response } from 'express';

import { ProblemDetailsDto } from '../errors/problem-details';
import { REFRESH_TOKEN_COOKIE_NAME } from './auth.constants';
import type { AuthRequest } from './auth.request';
import { AccessTokenResponseDto, MeResponseDto, RegisterUserResponseDto } from './auth.responses';
import {
  GET_ME_USE_CASE,
  LOGIN_USE_CASE,
  LOGOUT_USE_CASE,
  REFRESH_TOKEN_USE_CASE,
  REGISTER_USER_USE_CASE,
} from './auth.tokens';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(REGISTER_USER_USE_CASE)
    private readonly registerUser: RegisterUserUseCase,
    @Inject(LOGIN_USE_CASE)
    private readonly login: LoginUseCase,
    @Inject(REFRESH_TOKEN_USE_CASE)
    private readonly refreshToken: RefreshTokenUseCase,
    @Inject(LOGOUT_USE_CASE)
    private readonly logout: LogoutUseCase,
    @Inject(GET_ME_USE_CASE)
    private readonly getMe: GetMeUseCase,
    @Inject(ConfigService)
    private readonly configService: ConfigService<Env>,
  ) {}

  private getRefreshCookieOptions(): CookieOptions {
    const nodeEnv = this.configService.getOrThrow('NODE_ENV', { infer: true });
    const cookieDomain = this.configService.get('COOKIE_DOMAIN', {
      infer: true,
    });
    const refreshTokenTtlMs = this.configService.getOrThrow('REFRESH_TOKEN_TTL', {
      infer: true,
    });

    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: nodeEnv === 'production',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
      path: '/api/v1/auth',
      maxAge: refreshTokenTtlMs,
    };
  }

  private clearRefreshCookie(res: Response): void {
    const opts = this.getRefreshCookieOptions();
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      secure: opts.secure,
      ...(opts.domain ? { domain: opts.domain } : {}),
      path: opts.path,
    });
  }

  @ApiOperation({ summary: 'Register user' })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ type: ProblemDetailsDto })
  @ApiConflictResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Post('register')
  async register(
    @Body(new ValidationPipe({ transform: true, expectedType: RegisterDto })) dto: RegisterDto,
  ): Promise<RegisterUserResponseDto> {
    return this.registerUser.execute(dto);
  }

  @ApiOperation({ summary: 'Login' })
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiBadRequestResponse({ type: ProblemDetailsDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Post('login')
  @HttpCode(200)
  async loginUser(
    @Body(new ValidationPipe({ transform: true, expectedType: LoginDto })) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    const out = await this.login.execute(dto);

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, out.refreshToken, this.getRefreshCookieOptions());

    return {
      accessToken: out.accessToken,
    };
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiCookieAuth()
  @ApiOkResponse({ type: AccessTokenResponseDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    const ctx = req.auth;

    if (!ctx?.sessionId || !ctx.refreshToken) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const out = await this.refreshToken.execute({
        refreshToken: ctx.refreshToken,
        userId: ctx.userId,
        sessionId: ctx.sessionId,
      });

      res.cookie(REFRESH_TOKEN_COOKIE_NAME, out.refreshToken, this.getRefreshCookieOptions());

      return {
        accessToken: out.accessToken,
      };
    } catch (error: unknown) {
      if (error instanceof TokenRevokedError) {
        this.clearRefreshCookie(res);
        throw error;
      }

      throw error;
    }
  }

  @ApiOperation({ summary: 'Logout' })
  @ApiCookieAuth()
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Post('logout')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(204)
  async logoutUser(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response): Promise<void> {
    const ctx = req.auth;

    if (!ctx?.sessionId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.logout.execute({
      sessionId: ctx.sessionId,
    });

    this.clearRefreshCookie(res);
  }

  @ApiOperation({ summary: 'Get current user' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiTooManyRequestsResponse({ type: ProblemDetailsDto })
  @Get('me')
  @UseGuards(JwtAccessGuard)
  async me(@Req() req: AuthRequest): Promise<MeResponseDto> {
    const userId = req.auth?.userId;

    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.getMe.execute({ userId });
  }
}
