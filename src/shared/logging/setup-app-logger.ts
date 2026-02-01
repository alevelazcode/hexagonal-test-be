import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@shared/config/env';

import { createNestLogger } from './create-nest-logger';

export function setupAppLogger(app: INestApplication): void {
  const configService = app.get<ConfigService<Env>>(ConfigService);
  const logLevel = configService.getOrThrow('LOG_LEVEL', { infer: true });

  app.useLogger(createNestLogger({ logLevel }));
  app.flushLogs();
}
