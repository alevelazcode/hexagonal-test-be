import 'reflect-metadata';

import fs from 'node:fs/promises';

import { setupHttpApp } from '@interfaces/http/setup-http-app';
import { createOpenApiDocument } from '@interfaces/swagger/swagger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@src/app.module';

async function generate(): Promise<void> {
  process.env.NODE_ENV ??= 'development';

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  setupHttpApp(app);

  await app.init();

  const document = createOpenApiDocument(app);
  await fs.writeFile('openapi.json', JSON.stringify(document, null, 2));

  await app.close();
}

void generate();
