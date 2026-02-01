import { UnauthorizedError } from '@domain/auth/errors';
import type { UserRepositoryPort } from '@domain/auth/ports';

export interface GetMeInput {
  userId: string;
}

export interface GetMeOutput {
  id: string;
  email: string;
  createdAt: string;
}

export class GetMeUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(input: GetMeInput): Promise<GetMeOutput> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UnauthorizedError('Unauthorized');
    }

    return {
      id: user.id,
      email: user.email.value,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
