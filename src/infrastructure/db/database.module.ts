import { DATABASE } from '@infrastructure/db/database.constants';
import * as schema from '@infrastructure/db/schema';
import { createClient } from '@libsql/client';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@shared/config/env';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';

export type Database = LibSQLDatabase<typeof schema>;

@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => {
        const url = configService.getOrThrow('DATABASE_URL', { infer: true });
        const client = createClient({ url });

        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
