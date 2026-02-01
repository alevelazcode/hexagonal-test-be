import type { Env } from '@shared/config/env';

type StringifyEnvValue<T> = T extends number
  ? string
  : T extends boolean
    ? string
    : T extends string
      ? T
      : string;

type ProcessEnvFrom<T> = {
  [K in keyof T]?: StringifyEnvValue<T[K]> | undefined;
};

declare global {
  namespace NodeJS {
    interface ProcessEnv extends ProcessEnvFrom<Env> {
      CORS_ORIGIN?: string;
    }
  }
}

export {};
