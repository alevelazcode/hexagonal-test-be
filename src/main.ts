import 'reflect-metadata';

import { setupHttpApp } from '@interfaces/http/setup-http-app';
import { setupSwagger } from '@interfaces/swagger/swagger';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Env } from '@shared/config/env';
import { setupAppLogger } from '@shared/logging/setup-app-logger';
import { AppModule } from '@src/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  setupAppLogger(app);
  setupHttpApp(app);

  setupSwagger(app);

  const configService = app.get<ConfigService<Env>>(ConfigService);
  const port = configService.getOrThrow('APP_PORT', { infer: true });

  await app.listen(port);
}

void bootstrap();
