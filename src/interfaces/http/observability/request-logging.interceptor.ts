import {
  CallHandler,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { catchError, finalize, Observable, throwError } from 'rxjs';

import { CORRELATION_ID_HEADER } from './correlation-id';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const start = Date.now();
    let errorStatus: number | undefined;

    return next.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpException) {
          errorStatus = error.getStatus();
        } else {
          errorStatus = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        return throwError(() => error);
      }),
      finalize(() => {
        const durationMs = Date.now() - start;
        const correlationId = request.header(CORRELATION_ID_HEADER);
        const status = errorStatus ?? response.statusCode;

        Logger.log(
          JSON.stringify({
            type: 'http_request',
            method: request.method,
            path: request.originalUrl,
            status,
            durationMs,
            correlationId,
          }),
          'HTTP',
        );
      }),
    );
  }
}
