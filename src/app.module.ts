import { DatabaseModule } from '@infrastructure/db/database.module';
import { AuthHttpModule } from '@interfaces/http/auth';
import { HealthController } from '@interfaces/http/health.controller';
import { MessagingHttpModule } from '@interfaces/http/messaging';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { type Env, validateEnv } from '@shared/config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => {
        const ttl = configService.getOrThrow('RATE_LIMIT_TTL_MS', {
          infer: true,
        });
        const limit = configService.getOrThrow('RATE_LIMIT_LIMIT', {
          infer: true,
        });

        return {
          throttlers: [
            {
              ttl,
              limit,
            },
          ],
        };
      },
    }),
    AuthHttpModule,
    MessagingHttpModule,
    DatabaseModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
