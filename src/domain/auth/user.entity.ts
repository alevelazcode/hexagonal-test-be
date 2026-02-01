import type { Email } from './value-objects/email.value-object';
import type { PasswordHash } from './value-objects/password-hash.value-object';

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: PasswordHash;
  createdAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(input: UserProps): User {
    return new User({
      ...input,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): PasswordHash {
    return this.props.passwordHash;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
