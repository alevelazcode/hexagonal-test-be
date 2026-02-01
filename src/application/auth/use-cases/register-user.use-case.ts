import { User } from '@domain/auth';
import { EmailAlreadyExistsError } from '@domain/auth/errors';
import type { ClockPort, IdGeneratorPort, PasswordHasherPort, UserRepositoryPort } from '@domain/auth/ports';
import { Email, PasswordHash } from '@domain/auth/value-objects';

export interface RegisterUserInput {
  email: string;
  password: string;
}

export interface RegisterUserOutput {
  id: string;
  email: string;
  createdAt: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const email = Email.create(input.email);

    const existing = await this.userRepository.findByEmail(email.value);
    if (existing) {
      throw new EmailAlreadyExistsError('Email already exists');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);

    const now = this.clock.now();

    const user = User.create({
      id: this.idGenerator.generate(),
      email,
      passwordHash: PasswordHash.create(passwordHash),
      createdAt: now,
    });

    await this.userRepository.create(user);

    return {
      id: user.id,
      email: user.email.value,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
