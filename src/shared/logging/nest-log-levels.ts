import type { LogLevel } from '@nestjs/common';
import type { Env } from '@shared/config/env';

const levelOrder: readonly LogLevel[] = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'] as const;

type AppLogLevel = Env['LOG_LEVEL'];

export function getNestLogLevelsFromEnvLevel(level: AppLogLevel): LogLevel[] {
  const index = levelOrder.indexOf(level);

  if (index === -1) {
    return ['fatal', 'error', 'warn', 'log'];
  }

  return levelOrder.slice(0, index + 1);
}
