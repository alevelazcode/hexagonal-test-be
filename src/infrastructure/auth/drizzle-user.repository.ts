import { User } from '@domain/auth';
import type { UserRepositoryPort } from '@domain/auth/ports';
import { Email, PasswordHash } from '@domain/auth/value-objects';
import { DATABASE } from '@infrastructure/db/database.constants';
import type { Database } from '@infrastructure/db/database.module';
import { userTable } from '@infrastructure/db/schema';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';

export class DrizzleUserRepository implements UserRepositoryPort {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.select().from(userTable).where(eq(userTable.email, email.toLowerCase())).get();

    if (!row) {
      return null;
    }

    return User.create({
      id: row.id,
      email: Email.create(row.email),
      passwordHash: PasswordHash.create(row.passwordHash),
      createdAt: new Date(row.createdAt),
    });
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.select().from(userTable).where(eq(userTable.id, id)).get();

    if (!row) {
      return null;
    }

    return User.create({
      id: row.id,
      email: Email.create(row.email),
      passwordHash: PasswordHash.create(row.passwordHash),
      createdAt: new Date(row.createdAt),
    });
  }

  async create(user: User): Promise<void> {
    await this.db
      .insert(userTable)
      .values({
        id: user.id,
        email: user.email.value,
        passwordHash: user.passwordHash.value,
        createdAt: user.createdAt.toISOString(),
      })
      .run();
  }
}
