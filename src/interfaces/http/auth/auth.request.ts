import type { Request } from 'express';

export interface AuthContext {
  userId: string;
  sessionId?: string;
  refreshToken?: string;
}

export interface AuthRequest extends Request {
  auth?: AuthContext;
  cookies: Record<string, string>;
}
