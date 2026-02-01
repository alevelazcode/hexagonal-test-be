import { InvalidEmailError as ApplicationInvalidEmailError } from '@application/common/validation/errors/invalid-email.error';
import { InvalidPhoneNumberError } from '@application/common/validation/errors/invalid-phone-number.error';
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidEmailError as DomainInvalidEmailError,
  InvalidPasswordError,
  TokenRevokedError,
  UnauthorizedError,
} from '@domain/auth/errors';
import {
  ConversationNotFoundError,
  InvalidMessageContentError,
  InvalidTelegramChatIdError,
} from '@domain/messaging/errors';
import { ProblemDetailsExceptionFilter } from '@interfaces/http/errors/problem-details-exception.filter';
import { CORRELATION_ID_HEADER } from '@interfaces/http/observability/correlation-id';
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

interface CapturedReply {
  status: number;
  body: unknown;
}

function createHarness(params?: { url?: string; correlationId?: string }): {
  filter: ProblemDetailsExceptionFilter;
  capture: CapturedReply;
  catch: (exception: unknown) => void;
} {
  const capture: CapturedReply = { status: -1, body: undefined };

  const httpAdapter = {
    getRequestUrl: (req: { url?: string }) => req.url ?? '',
    reply: (_res: unknown, body: unknown, status: number) => {
      capture.status = status;
      capture.body = body;
    },
  };

  const adapterHost = { httpAdapter } as unknown as HttpAdapterHost;

  const filter = new ProblemDetailsExceptionFilter(adapterHost);

  const request = {
    url: params?.url ?? '/api/v1/test',
    header: (name: string) => {
      if (name === CORRELATION_ID_HEADER) {
        return params?.correlationId;
      }
      return undefined;
    },
  };

  const response = {};

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };

  return {
    filter,
    capture,
    catch: (exception: unknown) => {
      filter.catch(exception, host as never);
    },
  };
}

describe('ProblemDetailsExceptionFilter (unit)', () => {
  it('maps domain and application validation errors to 400 with stable error codes', () => {
    const cases: { exception: Error; errorCode: string }[] = [
      { exception: new ApplicationInvalidEmailError('Invalid email'), errorCode: 'invalid_email' },
      { exception: new DomainInvalidEmailError('Invalid email'), errorCode: 'invalid_email' },
      { exception: new InvalidPhoneNumberError('Invalid phone number'), errorCode: 'invalid_phone_number' },
      { exception: new InvalidPasswordError('Invalid password'), errorCode: 'invalid_password' },
      {
        exception: new InvalidMessageContentError('Invalid message content'),
        errorCode: 'invalid_message_content',
      },
      {
        exception: new InvalidTelegramChatIdError('Invalid telegram chat id'),
        errorCode: 'invalid_telegram_chat_id',
      },
    ];

    for (const c of cases) {
      const harness = createHarness({ url: '/api/v1/test', correlationId: 'cid' });
      harness.catch(c.exception);

      expect(harness.capture.status).toBe(HttpStatus.BAD_REQUEST);
      expect(harness.capture.body).toMatchObject({
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        instance: '/api/v1/test',
        errorCode: c.errorCode,
        correlationId: 'cid',
        detail: c.exception.message,
      });
    }
  });

  it('maps auth errors to 401 with stable error codes', () => {
    const cases: { exception: Error; errorCode: string }[] = [
      { exception: new InvalidCredentialsError('Invalid credentials'), errorCode: 'invalid_credentials' },
      { exception: new UnauthorizedError('Unauthorized'), errorCode: 'unauthorized' },
      { exception: new TokenRevokedError('Refresh token revoked'), errorCode: 'token_revoked' },
    ];

    for (const c of cases) {
      const harness = createHarness({ url: '/api/v1/test', correlationId: 'cid' });
      harness.catch(c.exception);

      expect(harness.capture.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(harness.capture.body).toMatchObject({
        type: 'about:blank',
        title: 'Unauthorized',
        status: 401,
        instance: '/api/v1/test',
        errorCode: c.errorCode,
        correlationId: 'cid',
        detail: c.exception.message,
      });
    }
  });

  it('maps conflicts and not found domain errors to correct statuses and codes', () => {
    const emailExists = createHarness({ url: '/api/v1/test', correlationId: 'cid' });
    emailExists.catch(new EmailAlreadyExistsError('Email already exists'));

    expect(emailExists.capture.status).toBe(HttpStatus.CONFLICT);
    expect(emailExists.capture.body).toMatchObject({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      instance: '/api/v1/test',
      errorCode: 'email_already_exists',
      correlationId: 'cid',
      detail: 'Email already exists',
    });

    const conversationNotFound = createHarness({ url: '/api/v1/test', correlationId: 'cid' });
    conversationNotFound.catch(new ConversationNotFoundError('Conversation not found'));

    expect(conversationNotFound.capture.status).toBe(HttpStatus.NOT_FOUND);
    expect(conversationNotFound.capture.body).toMatchObject({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      instance: '/api/v1/test',
      errorCode: 'conversation_not_found',
      correlationId: 'cid',
      detail: 'Conversation not found',
    });
  });

  it('maps HttpExceptions using normalized HttpException responses', () => {
    const harness = createHarness({ url: '/api/v1/test', correlationId: 'cid' });
    harness.catch(new BadRequestException(['a', 'b']));

    expect(harness.capture.status).toBe(HttpStatus.BAD_REQUEST);
    expect(harness.capture.body).toMatchObject({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      instance: '/api/v1/test',
      errorCode: 'http_bad_request',
      correlationId: 'cid',
      detail: 'Validation failed',
      errors: {
        _errors: ['a', 'b'],
      },
    });
  });

  it('falls back to base 500 problem details for unknown errors', () => {
    const logger = vi.spyOn(Logger, 'error').mockImplementation(() => undefined);

    const harness = createHarness({ url: '/api/v1/test', correlationId: 'cid' });
    harness.catch(new Error('boom'));

    expect(harness.capture.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(harness.capture.body).toMatchObject({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/api/v1/test',
      errorCode: 'http_internal_server_error',
      correlationId: 'cid',
    });

    logger.mockRestore();
  });

  it('includes empty correlationId when the header is missing', () => {
    const harness = createHarness({ url: '/api/v1/test' });
    harness.catch(new NotFoundException('Not Found'));

    expect(harness.capture.body).toMatchObject({
      correlationId: '',
    });
  });

  it('handles various HttpExceptions with the correct http_* error codes', () => {
    const cases: { exception: Error; status: number; errorCode: string; title: string }[] = [
      {
        exception: new UnauthorizedException('Unauthorized'),
        status: 401,
        errorCode: 'http_unauthorized',
        title: 'Unauthorized',
      },
      {
        exception: new NotFoundException('Not Found'),
        status: 404,
        errorCode: 'http_not_found',
        title: 'Not Found',
      },
      {
        exception: new ConflictException('Conflict'),
        status: 409,
        errorCode: 'http_conflict',
        title: 'Conflict',
      },
    ];

    for (const c of cases) {
      const harness = createHarness({ url: '/api/v1/test', correlationId: 'cid' });
      harness.catch(c.exception);

      expect(harness.capture.body).toMatchObject({
        status: c.status,
        title: c.title,
        errorCode: c.errorCode,
      });
    }
  });
});
