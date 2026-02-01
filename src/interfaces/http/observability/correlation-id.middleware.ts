import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { CORRELATION_ID_HEADER } from './correlation-id';

function normalizeHeaderValue(value: undefined | string | string[]): string | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = normalizeHeaderValue(req.header(CORRELATION_ID_HEADER));
  const correlationId = existing && existing.trim().length > 0 ? existing.trim() : crypto.randomUUID();

  req.headers[CORRELATION_ID_HEADER] = correlationId;
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}
