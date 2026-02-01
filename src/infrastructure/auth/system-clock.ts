import type { ClockPort } from '@domain/auth/ports/clock.port';

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
