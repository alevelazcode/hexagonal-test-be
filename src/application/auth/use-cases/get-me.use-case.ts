import { UnauthorizedError } from '@domain/auth/errors';
import type { UserRepositoryPort } from '@domain/auth/ports';

import type { GetMeInput, GetMeOutput } from './get-me.types';

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
