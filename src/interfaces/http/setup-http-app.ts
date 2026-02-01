import type { INestApplication } from '@nestjs/common';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { ProblemDetailsExceptionFilter } from './errors/problem-details-exception.filter';
import { correlationIdMiddleware } from './observability/correlation-id.middleware';
import { RequestLoggingInterceptor } from './observability/request-logging.interceptor';

export function setupHttpApp(app: INestApplication): void {
  app.useGlobalFilters(new ProblemDetailsExceptionFilter(app.get(HttpAdapterHost)));

  app.use(correlationIdMiddleware);
  app.use(cookieParser());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  const corsOrigins = process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? '*';

  if (corsOrigins.trim() === '*') {
    app.enableCors({
      origin: true,
      credentials: true,
    });
  } else {
    const origins = corsOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    app.enableCors({
      origin: origins,
      credentials: true,
    });
  }

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
