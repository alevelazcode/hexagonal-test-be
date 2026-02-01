import type { User } from '../user.entity';

export interface UserRepositoryPort {
  findByEmail: (email: string) => Promise<User | null>;
  findById: (id: string) => Promise<User | null>;
  create: (user: User) => Promise<void>;
}
