import { createHmac } from 'node:crypto';

import { type NextRequest } from 'next/server';
import { type z } from 'zod';

import { getServerEnv } from '@/lib/env';
import { ApiError, ValidationError } from '@/lib/errors/api-error';
import { isAllowedOrigin } from '@/lib/http/origin';

const DEFAULT_MAX_BODY_BYTES = 32 * 1024;

export function assertAllowedOrigin(request: NextRequest): void {
  if (!isAllowedOrigin(request.headers.get('origin'), getServerEnv().allowedOrigins)) {
    throw new ApiError(403, 'FORBIDDEN', 'The request origin is not allowed');
  }
}

async function readLimitedText(request: Request, maxBytes: number): Promise<string> {
  if (!request.body) {
    throw new ValidationError('A JSON request body is required');
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, 'INVALID_REQUEST', 'The request body is too large');
    }
    result += decoder.decode(value, { stream: true });
  }

  return result + decoder.decode();
}

export async function parseExternalJsonBody(request: Request, maxBytes = DEFAULT_MAX_BODY_BYTES): Promise<unknown> {
  try {
    return JSON.parse(await readLimitedText(request, maxBytes));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ValidationError('The request body must contain valid JSON', { cause: error });
  }
}

export async function parseJsonBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  maxBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<T> {
  assertAllowedOrigin(request);
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim();
  if (contentType !== 'application/json') {
    throw new ValidationError('Content-Type must be application/json');
  }

  const value = await parseExternalJsonBody(request, maxBytes);

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'The request is invalid');
  }
  return parsed.data;
}

function getClientAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for');
  return forwarded?.split(',', 1)[0]?.trim() || 'unknown';
}

export function getPrivateRequestFingerprint(request: NextRequest): string {
  return createHmac('sha256', getServerEnv().RATE_LIMIT_SECRET)
    .update(getClientAddress(request))
    .digest('hex');
}
