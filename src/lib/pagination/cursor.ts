import { Buffer } from 'node:buffer';

import { type z } from 'zod';

import { ValidationError } from '@/lib/errors/api-error';

const MAX_CURSOR_LENGTH = 768;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function encodeOpaqueCursor(value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeOpaqueCursor<T>(cursor: string, schema: z.ZodType<T>): T {
  if (
    cursor.length === 0
    || cursor.length > MAX_CURSOR_LENGTH
    || !BASE64URL_PATTERN.test(cursor)
  ) {
    throw new ValidationError('The pagination cursor is invalid');
  }

  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsedJson: unknown = JSON.parse(decoded);
    const parsed = schema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new ValidationError('The pagination cursor is invalid');
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('The pagination cursor is invalid', { cause: error });
  }
}
