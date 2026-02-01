import type { ProcessTelegramUpdatesUseCase } from '@application/messaging/use-cases';
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@shared/config/env';

import { PROCESS_TELEGRAM_UPDATES_USE_CASE } from './messaging.tokens';

@Injectable()
export class TelegramPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramPollingService.name);

  private timer: NodeJS.Timeout | undefined;
  private running = false;

  private pollLimit = 25;
  private pollTimeoutSeconds = 0;

  constructor(
    @Inject(PROCESS_TELEGRAM_UPDATES_USE_CASE)
    private readonly processTelegramUpdates: ProcessTelegramUpdatesUseCase,
    @Inject(ConfigService)
    private readonly configService: ConfigService<Env>,
  ) {}

  onModuleInit(): void {
    const nodeEnv = this.configService.getOrThrow('NODE_ENV', { infer: true });
    const token = this.configService.get('TELEGRAM_BOT_TOKEN', { infer: true });

    if (nodeEnv === 'test' || !token) {
      return;
    }

    const intervalMs = this.configService.getOrThrow('TELEGRAM_POLL_INTERVAL_MS', { infer: true });
    this.pollLimit = this.configService.getOrThrow('TELEGRAM_POLL_LIMIT', { infer: true });
    this.pollTimeoutSeconds = this.configService.getOrThrow('TELEGRAM_POLL_TIMEOUT_SECONDS', { infer: true });

    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);

    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      await this.processTelegramUpdates.execute({
        limit: this.pollLimit,
        timeoutSeconds: this.pollTimeoutSeconds,
      });
    } catch (error: unknown) {
      this.logger.error(error);
    } finally {
      this.running = false;
    }
  }
}
