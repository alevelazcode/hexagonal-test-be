import { ConsoleLogger } from '@nestjs/common';
import type { Env } from '@shared/config/env';

import { getNestLogLevelsFromEnvLevel } from './nest-log-levels';

interface Params {
  logLevel: Env['LOG_LEVEL'];
  context?: string;
}

export function createNestLogger(params: Params): ConsoleLogger {
  const options: {
    logLevels: ReturnType<typeof getNestLogLevelsFromEnvLevel>;
    timestamp: true;
    context?: string;
  } = {
    logLevels: getNestLogLevelsFromEnvLevel(params.logLevel),
    timestamp: true,
  };

  if (params.context) {
    options.context = params.context;
  }

  return new ConsoleLogger(options);
}
