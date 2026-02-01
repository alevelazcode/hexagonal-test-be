export interface RefreshTokenSessionProps {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  replacedById?: string;
}

export class RefreshTokenSession {
  private constructor(private readonly props: RefreshTokenSessionProps) {}

  static create(input: RefreshTokenSessionProps): RefreshTokenSession {
    return new RefreshTokenSession({
      ...input,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | undefined {
    return this.props.revokedAt;
  }

  get replacedById(): string | undefined {
    return this.props.replacedById;
  }
}
