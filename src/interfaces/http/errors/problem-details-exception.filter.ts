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
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';

import { CORRELATION_ID_HEADER } from '../observability/correlation-id';
import type { ProblemDetails } from './problem-details';

type HttpExceptionResponse =
  | string
  | {
      message?: string | string[];
      error?: string;
      statusCode?: number;
      errors?: Record<string, string[]>;
    };

function getHttpTitle(status: HttpStatus): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'Bad Request';
    case HttpStatus.UNAUTHORIZED:
      return 'Unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'Forbidden';
    case HttpStatus.NOT_FOUND:
      return 'Not Found';
    case HttpStatus.CONFLICT:
      return 'Conflict';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'Unprocessable Entity';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'Too Many Requests';
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return 'Internal Server Error';
    default:
      return 'Error';
  }
}

function normalizeHttpExceptionResponse(response: HttpExceptionResponse): {
  detail?: string;
  errors?: Record<string, string[]>;
} {
  if (typeof response === 'string') {
    return { detail: response };
  }

  const errors = response.errors;

  if (Array.isArray(response.message)) {
    const messages = response.message.filter((message): message is string => typeof message === 'string');

    return messages.length
      ? { detail: 'Validation failed', errors: { _errors: messages } }
      : errors
        ? { detail: 'Validation failed', errors }
        : { detail: 'Validation failed' };
  }

  if (typeof response.message === 'string') {
    return errors ? { detail: response.message, errors } : { detail: response.message };
  }

  if (typeof response.error === 'string') {
    return errors ? { detail: response.error, errors } : { detail: response.error };
  }

  return errors ? { errors } : {};
}

function getKnownHttpStatus(exception: unknown): HttpStatus | undefined {
  if (
    exception instanceof ApplicationInvalidEmailError ||
    exception instanceof InvalidPhoneNumberError ||
    exception instanceof DomainInvalidEmailError ||
    exception instanceof InvalidPasswordError ||
    exception instanceof InvalidMessageContentError ||
    exception instanceof InvalidTelegramChatIdError
  ) {
    return HttpStatus.BAD_REQUEST;
  }

  if (
    exception instanceof InvalidCredentialsError ||
    exception instanceof UnauthorizedError ||
    exception instanceof TokenRevokedError
  ) {
    return HttpStatus.UNAUTHORIZED;
  }

  if (exception instanceof EmailAlreadyExistsError) {
    return HttpStatus.CONFLICT;
  }

  if (exception instanceof ConversationNotFoundError) {
    return HttpStatus.NOT_FOUND;
  }

  return undefined;
}

function getErrorCode(status: HttpStatus, exception: unknown): string {
  if (exception instanceof ApplicationInvalidEmailError || exception instanceof DomainInvalidEmailError) {
    return 'invalid_email';
  }

  if (exception instanceof InvalidPhoneNumberError) {
    return 'invalid_phone_number';
  }

  if (exception instanceof InvalidPasswordError) {
    return 'invalid_password';
  }

  if (exception instanceof InvalidCredentialsError) {
    return 'invalid_credentials';
  }

  if (exception instanceof UnauthorizedError) {
    return 'unauthorized';
  }

  if (exception instanceof TokenRevokedError) {
    return 'token_revoked';
  }

  if (exception instanceof EmailAlreadyExistsError) {
    return 'email_already_exists';
  }

  if (exception instanceof ConversationNotFoundError) {
    return 'conversation_not_found';
  }

  if (exception instanceof InvalidMessageContentError) {
    return 'invalid_message_content';
  }

  if (exception instanceof InvalidTelegramChatIdError) {
    return 'invalid_telegram_chat_id';
  }

  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'http_bad_request';
    case HttpStatus.UNAUTHORIZED:
      return 'http_unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'http_forbidden';
    case HttpStatus.NOT_FOUND:
      return 'http_not_found';
    case HttpStatus.CONFLICT:
      return 'http_conflict';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'http_unprocessable_entity';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'http_too_many_requests';
    case HttpStatus.INTERNAL_SERVER_ERROR:
      return 'http_internal_server_error';
    default:
      return 'http_error';
  }
}

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const knownStatus = getKnownHttpStatus(exception);

    const status: HttpStatus =
      exception instanceof HttpException
        ? (exception.getStatus() as HttpStatus)
        : (knownStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const instance = String(httpAdapter.getRequestUrl(request));
    const correlationId = request.header(CORRELATION_ID_HEADER) ?? '';
    const errorCode = getErrorCode(status, exception);

    const base: ProblemDetails = {
      type: 'about:blank',
      title: getHttpTitle(status),
      status,
      instance,
      errorCode,
      correlationId,
    };

    if (knownStatus !== undefined) {
      const body: ProblemDetails = {
        ...base,
        ...(exception instanceof Error ? { detail: exception.message } : {}),
      };

      httpAdapter.reply(response, body, status);
      return;
    }

    if (exception instanceof HttpException) {
      const normalized = normalizeHttpExceptionResponse(exception.getResponse() as HttpExceptionResponse);

      const body: ProblemDetails = {
        ...base,
        ...(normalized.detail ? { detail: normalized.detail } : {}),
        ...(normalized.errors ? { errors: normalized.errors } : {}),
      };

      httpAdapter.reply(response, body, status);
      return;
    }

    if (exception instanceof Error) {
      Logger.error(exception.message, exception.stack, 'ProblemDetailsExceptionFilter');
    } else {
      Logger.error(String(exception), undefined, 'ProblemDetailsExceptionFilter');
    }

    httpAdapter.reply(response, base, status);
  }
}
