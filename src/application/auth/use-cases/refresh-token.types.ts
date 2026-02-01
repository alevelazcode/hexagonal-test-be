export interface RefreshTokenInput {
  refreshToken: string;
  userId: string;
  sessionId: string;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}
